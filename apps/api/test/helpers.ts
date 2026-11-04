import argon2 from 'argon2';
import request from 'supertest';
import type { Rol } from '@colpa/shared';
import { crearApp } from '../src/app';
import { prisma } from '../src/db';

export const CLAVE = 'clave-de-prueba-123';
const hashPromise = argon2.hash(CLAVE);

export const app = () => crearApp({ loginMax: 1000 });

export async function limpiar() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE sesion_revocada, registro_auditoria, funcionario, unidad CASCADE',
  );
}

export const crearUnidad = (nombre = 'Salud') =>
  prisma.unidad.create({ data: { nombre, area: 'SALUD' } });

export async function crearFuncionario(
  unidadId: string,
  rol: Rol = 'PUBLICADOR',
  cuenta = `${rol.toLowerCase()}.test`,
  extra: { activo?: boolean } = {},
) {
  return prisma.funcionario.create({
    data: {
      nombreCompleto: `Prueba ${cuenta}`,
      identificadorCuenta: cuenta,
      hashContrasena: await hashPromise,
      rol,
      unidadId,
      ...extra,
    },
  });
}

export const login = (a: ReturnType<typeof app>, identificadorCuenta: string, contrasena = CLAVE) =>
  request(a).post('/api/v1/auth/login').send({ identificadorCuenta, contrasena });

export async function token(a: ReturnType<typeof app>, cuenta: string): Promise<string> {
  const res = await login(a, cuenta);
  return res.body.token as string;
}
