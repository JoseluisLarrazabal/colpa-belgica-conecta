import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { BLOQUEO_MIN, JWT_SECRET, MAX_INTENTOS, TOKEN_TTL_SEG } from '../config';
import { ErrorHttp } from '../middleware/error';
import type { Rol } from '@colpa/shared';

export const MENSAJE_LOGIN = 'Credenciales incorrectas';
// Hash descartable: se verifica cuando la cuenta no existe para igualar el tiempo de respuesta.
const hashFalso = argon2.hash(randomUUID());

export async function iniciarSesion(identificadorCuenta: string, contrasena: string) {
  const f = await prisma.funcionario.findUnique({ where: { identificadorCuenta } });
  const coincide = await argon2.verify(f?.hashContrasena ?? (await hashFalso), contrasena);
  const bloqueada = !!f?.bloqueadoHasta && f.bloqueadoHasta > new Date();

  if (!f || !f.activo || bloqueada || !coincide) {
    // Intento fallido de una cuenta existente y activa: contador atómico; al llegar a N bloquea y reinicia.
    if (f?.activo && !bloqueada) {
      const { intentosFallidos } = await prisma.funcionario.update({
        where: { id: f.id },
        data: { intentosFallidos: { increment: 1 } },
      });
      if (intentosFallidos >= MAX_INTENTOS) {
        await prisma.funcionario.update({
          where: { id: f.id },
          data: {
            intentosFallidos: 0,
            bloqueadoHasta: new Date(Date.now() + BLOQUEO_MIN * 60_000),
          },
        });
      }
    }
    throw new ErrorHttp(401, MENSAJE_LOGIN);
  }

  // Reinicio del contador y registro de auditoría en una sola transacción.
  await prisma.$transaction([
    prisma.funcionario.update({
      where: { id: f.id },
      data: { intentosFallidos: 0, bloqueadoHasta: null },
    }),
    prisma.registroAuditoria.create({
      data: {
        funcionarioId: f.id,
        accion: 'INICIAR_SESION',
        entidad: 'funcionario',
        entidadId: f.id,
      },
    }),
  ]);

  const token = jwt.sign({ rol: f.rol }, JWT_SECRET, {
    algorithm: 'HS256',
    subject: f.id,
    jwtid: randomUUID(),
    expiresIn: TOKEN_TTL_SEG,
  });
  return {
    token,
    expiraEn: new Date(Date.now() + TOKEN_TTL_SEG * 1000).toISOString(),
    funcionario: { id: f.id, nombreCompleto: f.nombreCompleto, rol: f.rol, unidadId: f.unidadId },
  };
}

export interface Sesion {
  id: string;
  rol: Rol;
  unidadId: string;
  jti: string;
  exp: number;
}

/** Valida firma, vencimiento, revocación y que la cuenta siga activa. Rol y unidad salen de la BD, no del token. */
export async function validarToken(token: string): Promise<Sesion> {
  let p: jwt.JwtPayload;
  try {
    const dec = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof dec === 'string' || !dec.sub || !dec.jti || !dec.exp) throw new Error('payload');
    p = dec;
  } catch {
    throw new ErrorHttp(401, 'No autenticado');
  }
  const [revocada, f] = await Promise.all([
    prisma.sesionRevocada.findUnique({ where: { jti: p.jti! } }),
    prisma.funcionario.findUnique({ where: { id: p.sub! } }),
  ]);
  if (revocada || !f?.activo) throw new ErrorHttp(401, 'No autenticado');
  return { id: f.id, rol: f.rol, unidadId: f.unidadId, jti: p.jti!, exp: p.exp! };
}

export async function cerrarSesion(s: Sesion): Promise<void> {
  await prisma.sesionRevocada.upsert({
    where: { jti: s.jti },
    update: {},
    create: { funcionarioId: s.id, jti: s.jti, expiraEn: new Date(s.exp * 1000) },
  });
  await prisma.sesionRevocada.deleteMany({ where: { expiraEn: { lt: new Date() } } }); // depuración (Tabla 2.63)
}
