import {
  CAMPOS_EXTRA,
  camposExtra,
  fichaSchema,
  puedeTransicionar,
  TRANSICIONES,
  type Accion,
  type EditarFichaInput,
  type FichaInput,
  type ListarPublicacionesInput,
  type Rol,
} from '@colpa/shared';
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/error';
import type { Prisma, Publicacion } from '../generated/prisma/client';
import { detalleValidacion } from '../middleware/validar';
import { registrar } from './auditoria.service';

type Tx = Prisma.TransactionClient;
export interface Actor {
  id: string;
  rol: Rol;
  unidadId: string;
}

const noExiste = () => new ErrorHttp(404, 'La publicación no existe');

// date / time de PostgreSQL <-> 'YYYY-MM-DD' / 'HH:MM' de la API.
const aFecha = (s?: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);
const aHora = (s: string) => new Date(`1970-01-01T${s}:00Z`);

/** Fila -> representación de la API (misma forma que la ficha de entrada). */
export function aDto<T extends Publicacion>(p: T) {
  return {
    ...p,
    fechaInicio: p.fechaInicio?.toISOString().slice(0, 10) ?? null,
    fechaFin: p.fechaFin?.toISOString().slice(0, 10) ?? null,
    hora: p.hora?.toISOString().slice(11, 16) ?? null,
  };
}

/** Columnas de la ficha en el orden de Prisma, a partir de una ficha ya validada. */
const aColumnas = (f: FichaInput) => ({
  ...f,
  fechaInicio: aFecha(f.fechaInicio)!,
  fechaFin: aFecha(f.fechaFin),
  hora: aHora(f.hora),
});

/** Valida la ficha completa; si falta algo, 400 con los campos faltantes (RF-04, RF-06). */
function validarFicha(entrada: unknown): FichaInput {
  const r = fichaSchema.safeParse(entrada);
  if (r.success) return r.data;
  throw new ErrorHttp(
    400,
    'Faltan campos obligatorios o son inválidos',
    detalleValidacion(r.error),
  );
}

/** Bloquea la fila (FOR UPDATE) y la devuelve; serializa cambios concurrentes sobre la misma publicación. */
async function bloquear(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM publicacion WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.publicacion.findUnique({ where: { id } });
}

/** Publicación de la unidad del Publicador, bloqueada y en Borrador. 404 si es de otra unidad (RNF-31). */
export async function borradorPropio(tx: Tx, id: string, f: Actor) {
  const p = await bloquear(tx, id);
  if (!p || p.unidadId !== f.unidadId) throw noExiste();
  if (p.estado !== 'BORRADOR') {
    throw new ErrorHttp(409, 'Solo se puede modificar una publicación en Borrador');
  }
  return p;
}

export const crear = (entrada: FichaInput, f: Actor) =>
  prisma.$transaction(async (tx) => {
    const p = await tx.publicacion.create({
      data: { ...aColumnas(entrada), unidadId: f.unidadId, autorId: f.id },
    });
    await registrar(tx, {
      funcionarioId: f.id,
      accion: 'CREAR',
      entidadId: p.id,
      estadoResultante: p.estado,
    });
    return aDto(p);
  });

export const editar = (id: string, cambios: EditarFichaInput, f: Actor) =>
  prisma.$transaction(async (tx) => {
    const actual = await borradorPropio(tx, id, f);
    // La ficha no cambia de tipo: un campo extra de otro tipo es un error, no se ignora en silencio.
    const propios = camposExtra(actual.tipo);
    const ajeno = Object.keys(cambios).find(
      (k) => !propios.includes(k) && CAMPOS_EXTRA.includes(k),
    );
    if (ajeno) throw new ErrorHttp(400, `El campo ${ajeno} no corresponde al tipo ${actual.tipo}`);
    const ficha = validarFicha({ ...aDto(actual), ...cambios });
    const nueva = aColumnas(ficha);
    const igual = (Object.keys(nueva) as (keyof typeof nueva)[]).every(
      (k) => JSON.stringify(nueva[k]) === JSON.stringify(actual[k as keyof typeof actual]),
    );
    if (igual) return aDto(actual); // sin cambios reales no se escribe ni se audita
    const p = await tx.publicacion.update({ where: { id }, data: aColumnas(ficha) });
    await registrar(tx, {
      funcionarioId: f.id,
      accion: 'EDITAR',
      entidadId: id,
      estadoResultante: p.estado,
    });
    return aDto(p);
  });

/** Descarte: elimina físicamente un borrador que nunca se envió a revisión (Tabla 2.65). */
export const descartar = (id: string, f: Actor) =>
  prisma.$transaction(async (tx) => {
    await borradorPropio(tx, id, f);
    const enviada = await tx.registroAuditoria.count({
      where: { entidad: 'publicacion', entidadId: id, accion: 'ENVIAR_REVISION' },
    });
    if (enviada)
      throw new ErrorHttp(409, 'La publicación ya se envió a revisión y no se puede descartar');
    await tx.imagen.deleteMany({ where: { publicacionId: id } });
    await tx.publicacion.delete({ where: { id } });
    await registrar(tx, {
      funcionarioId: f.id,
      accion: 'DESCARTAR',
      entidadId: id,
      estadoResultante: null,
    });
  });

/** El Aprobador nunca ve borradores; el Publicador solo ve su unidad. Fuera de eso, 404. */
// `visible` y `puedeVer` expresan la misma regla de acceso: cambiar una exige cambiar la otra.
export const puedeVer = (p: Pick<Publicacion, 'unidadId' | 'estado'>, f: Actor) =>
  f.rol === 'APROBADOR' ? p.estado !== 'BORRADOR' : p.unidadId === f.unidadId;
const visible = (f: Actor): Prisma.PublicacionWhereInput =>
  f.rol === 'APROBADOR' ? { estado: { not: 'BORRADOR' } } : { unidadId: f.unidadId };

export async function listar(q: ListarPublicacionesInput, f: Actor) {
  if (f.rol === 'APROBADOR' && q.estado === 'BORRADOR') throw new ErrorHttp(403, 'Acceso denegado');
  // Aprobador sin filtro: la cola de revisión (CU-04); Publicador sin filtro: todas las de su unidad.
  const estado = q.estado ?? (f.rol === 'APROBADOR' ? 'EN_REVISION' : undefined);
  const filas = await prisma.publicacion.findMany({
    where: { ...visible(f), ...(estado && { estado }), ...(q.modulo && { modulo: q.modulo }) },
    orderBy: [{ actualizadoEn: 'desc' }, { id: 'asc' }],
    take: q.limite,
    skip: q.desplazamiento,
  });
  return filas.map(aDto);
}

export async function obtener(id: string, f: Actor) {
  const p = await prisma.publicacion.findFirst({
    where: { id, ...visible(f) },
    include: { imagenes: { orderBy: { orden: 'asc' } } },
  });
  if (!p) throw noExiste();
  return aDto(p);
}

/** Efecto de cada acción sobre la fila, además del cambio de estado. */
const EFECTOS: Record<Accion, (f: Actor, observaciones?: string) => Prisma.PublicacionUpdateInput> =
  {
    ENVIAR_REVISION: () => ({ observaciones: null }), // el historial queda en la auditoría
    PUBLICAR: (f) => ({ publicadoEn: new Date(), aprobador: { connect: { id: f.id } } }),
    DEVOLVER: (_f, observaciones) => ({ observaciones }),
    ARCHIVAR: () => ({ archivadoEn: new Date() }),
  };

/**
 * Única máquina de estados (Tabla 2.2 / 2.65): valida, cambia el estado y audita en una sola transacción.
 * La fila se bloquea, así que de dos Aprobadores simultáneos gana uno y el otro recibe 409.
 */
export async function transicionar(
  id: string,
  accion: Accion,
  f: Actor,
  extra: { observaciones?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const p = await bloquear(tx, id);
    // No filtrar por unidad revelaría la existencia; el Aprobador no ve borradores de nadie.
    if (!p || !puedeVer(p, f)) throw noExiste();
    // segunda guarda: la ruta ya filtra por rol
    if (TRANSICIONES[accion].rol !== f.rol) throw new ErrorHttp(403, 'Acceso denegado');
    const hacia = puedeTransicionar(p.estado, accion, f.rol);
    if (!hacia) {
      throw new ErrorHttp(409, `La publicación está en estado ${p.estado} y no admite ${accion}`);
    }

    const observaciones = extra.observaciones?.trim();
    if (accion === 'ENVIAR_REVISION') validarFicha(aDto(p));
    if (accion === 'DEVOLVER' && !observaciones) {
      throw new ErrorHttp(400, 'Las observaciones son obligatorias para devolver');
    }

    const actualizada = await tx.publicacion.update({
      where: { id },
      data: { estado: hacia, ...EFECTOS[accion](f, observaciones) },
    });
    await registrar(tx, {
      funcionarioId: f.id,
      accion,
      entidadId: id,
      estadoResultante: hacia,
      ...(accion === 'DEVOLVER' && { detalle: observaciones }),
    });
    return aDto(actualizada);
  });
}
