import argon2 from 'argon2';
import type { CrearCuentaInput, EditarCuentaInput, Rol } from '@colpa/shared';
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/error';
import { Prisma } from '../generated/prisma/client';

type Tx = Prisma.TransactionClient;

// Nunca se expone hashContrasena.
const PUBLICO = {
  id: true,
  nombreCompleto: true,
  identificadorCuenta: true,
  rol: true,
  unidadId: true,
  activo: true,
  creadoEn: true,
} as const;

export const listarUnidades = () => prisma.unidad.findMany({ orderBy: { nombre: 'asc' } });

export const listarCuentas = () =>
  prisma.funcionario.findMany({ select: PUBLICO, orderBy: { creadoEn: 'asc' } });

async function exigirUnidad(tx: Tx, id: string) {
  if (!(await tx.unidad.findUnique({ where: { id } }))) {
    throw new ErrorHttp(400, 'La unidad municipal no existe');
  }
}

export async function crearCuenta(d: CrearCuentaInput) {
  const { contrasena, ...resto } = d;
  const hashContrasena = await argon2.hash(contrasena);
  try {
    return await prisma.$transaction(async (tx) => {
      await exigirUnidad(tx, d.unidadId);
      return tx.funcionario.create({ data: { ...resto, hashContrasena }, select: PUBLICO });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ErrorHttp(409, 'El identificador de cuenta ya existe');
    }
    throw e;
  }
}

/**
 * Bloquea las filas de administradores activos (FOR UPDATE) y rechaza el cambio si dejaría la
 * aplicación sin ninguno. Serializa operaciones concurrentes sobre administradores.
 */
async function conservarAdministrador(
  tx: Tx,
  id: string,
  rolActual: Rol,
  activo: boolean,
  rolNuevo: Rol,
  activoNuevo: boolean,
) {
  const pierde =
    rolActual === 'ADMIN_TECNICO' && activo && (rolNuevo !== 'ADMIN_TECNICO' || !activoNuevo);
  if (!pierde) return;
  const admins = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM funcionario WHERE rol = 'ADMIN_TECNICO' AND activo FOR UPDATE`;
  if (!admins.some((a) => a.id !== id)) {
    throw new ErrorHttp(409, 'Debe quedar al menos un Administrador técnico activo');
  }
}

async function modificar(
  id: string,
  cambios: { rol?: Rol; activo?: boolean; nombreCompleto?: string; unidadId?: string },
) {
  return prisma.$transaction(async (tx) => {
    const f = await tx.funcionario.findUnique({ where: { id } });
    if (!f) throw new ErrorHttp(404, 'La cuenta no existe');
    if (cambios.unidadId) await exigirUnidad(tx, cambios.unidadId);
    await conservarAdministrador(
      tx,
      id,
      f.rol,
      f.activo,
      cambios.rol ?? f.rol,
      cambios.activo ?? f.activo,
    );
    // Reactivar una cuenta también limpia su bloqueo por intentos.
    const reactiva = cambios.activo === true && !f.activo;
    return tx.funcionario.update({
      where: { id },
      data: { ...cambios, ...(reactiva && { intentosFallidos: 0, bloqueadoHasta: null }) },
      select: PUBLICO,
    });
  });
}

export const editarCuenta = (id: string, d: EditarCuentaInput) => modificar(id, d);
export const asignarRol = (id: string, rol: Rol) => modificar(id, { rol });
