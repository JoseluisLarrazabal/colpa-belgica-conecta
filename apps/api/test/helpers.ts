import argon2 from 'argon2';
import request from 'supertest';
import type { Rol } from '@colpa/shared';
import { crearApp } from '../src/app';
import { prisma } from '../src/db';

export const CLAVE = 'clave-de-prueba-123';
const hashPromise = argon2.hash(CLAVE);

export const app = () => crearApp({ loginMax: 1000, publicoMax: 100_000 });

export async function limpiar() {
  // El trigger anti-TRUNCATE de la auditoría se salta solo aquí (el rol de pruebas es superusuario).
  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET LOCAL session_replication_role = replica'),
    prisma.$executeRawUnsafe(
      'TRUNCATE TABLE sesion_revocada, registro_auditoria, funcionario, unidad CASCADE',
    ),
  ]);
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

// ---- Publicaciones ----
export const FICHA = {
  modulo: 'SALUD',
  tipo: 'CAMPANA_VACUNACION',
  titulo: 'Campaña de vacunación contra la influenza',
  detalle: 'Vacunación gratuita en la plaza principal.',
  fechaInicio: '2026-12-10',
  hora: '09:30',
  lugar: 'Plaza principal de Belgica',
  poblacionObjetivo: 'Adultos mayores de 60 años',
  requisitos: 'Cédula de identidad',
  tipoVacuna: 'Influenza estacional',
} as const;

export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const P = '/api/v1/panel/publicaciones';

export const api = {
  crear: (a: ReturnType<typeof app>, t: string, body: object = FICHA) =>
    request(a).post(P).set(auth(t)).send(body),
  editar: (a: ReturnType<typeof app>, t: string, id: string, body: object) =>
    request(a).patch(`${P}/${id}`).set(auth(t)).send(body),
  obtener: (a: ReturnType<typeof app>, t: string, id: string) =>
    request(a).get(`${P}/${id}`).set(auth(t)),
  /** enviar | publicar | devolver | archivar */
  accion: (a: ReturnType<typeof app>, t: string, id: string, accion: string, body?: object) =>
    request(a)
      .post(`${P}/${id}/${accion}`)
      .set(auth(t))
      .send(body ?? {}),
};

/** Borrador de la unidad del funcionario, creado directamente en la BD (permite fichas incompletas). */
export const borradorDirecto = (unidadId: string, autorId: string, extra: object = {}) =>
  prisma.publicacion.create({
    data: {
      modulo: 'SALUD',
      tipo: 'CAMPANA_VACUNACION',
      titulo: 'Borrador incompleto',
      unidadId,
      autorId,
      ...extra,
    },
  });

export const auditoriaDe = (entidadId: string) =>
  prisma.registroAuditoria.findMany({ where: { entidadId }, orderBy: { fecha: 'asc' } });
