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

interface FilaLogin {
  id: string;
  nombre_completo: string;
  hash_contrasena: string;
  rol: Rol;
  unidad_id: string;
  intentos_fallidos: number;
  version_sesion: number;
}

export async function iniciarSesion(identificadorCuenta: string, contrasena: string) {
  // Reserva atómica de un intento ANTES de verificar: solo MAX_INTENTOS verificaciones concurrentes
  // pueden pasar por ciclo, así que las solicitudes en vuelo no sortean el bloqueo.
  const [f] = await prisma.$queryRaw<FilaLogin[]>`
    UPDATE funcionario SET intentos_fallidos = intentos_fallidos + 1
    WHERE identificador_cuenta = ${identificadorCuenta} AND activo
      AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= now())
      AND intentos_fallidos < ${MAX_INTENTOS}
    RETURNING id, nombre_completo, hash_contrasena, rol, unidad_id, intentos_fallidos, version_sesion`;
  // Sin fila (inexistente, inactiva o bloqueada) se verifica un hash falso para igualar el tiempo.
  const coincide = await argon2.verify(f?.hash_contrasena ?? (await hashFalso), contrasena);

  if (!f || !coincide) {
    if (f && f.intentos_fallidos >= MAX_INTENTOS) {
      await prisma.funcionario.updateMany({
        where: { id: f.id, intentosFallidos: { gte: MAX_INTENTOS } },
        data: { intentosFallidos: 0, bloqueadoHasta: new Date(Date.now() + BLOQUEO_MIN * 60_000) },
      });
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

  const token = jwt.sign({ sv: f.version_sesion }, JWT_SECRET, {
    algorithm: 'HS256',
    subject: f.id,
    jwtid: randomUUID(),
    expiresIn: TOKEN_TTL_SEG,
  });
  const { exp } = jwt.decode(token) as jwt.JwtPayload;
  return {
    token,
    expiraEn: new Date(exp! * 1000).toISOString(),
    funcionario: {
      id: f.id,
      nombreCompleto: f.nombre_completo,
      rol: f.rol,
      unidadId: f.unidad_id,
    },
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
  // sv = versión de sesión; cambiar rol/activo la incrementa e invalida los tokens anteriores.
  if (revocada || !f?.activo || !Number.isInteger(p.sv) || p.sv !== f.versionSesion)
    throw new ErrorHttp(401, 'No autenticado');
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
