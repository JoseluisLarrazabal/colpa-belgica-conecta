import { createHash } from 'node:crypto';
import type { ListarPublicasInput } from '@colpa/shared';
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/error';
import type { Prisma } from '../generated/prisma/client';

// Solo campos aptos para el ciudadano: sin autor, aprobador, observaciones ni auditoría.
const SELECT = {
  id: true,
  modulo: true,
  tipo: true,
  titulo: true,
  detalle: true,
  fechaInicio: true,
  fechaFin: true,
  hora: true,
  lugar: true,
  poblacionObjetivo: true,
  requisitos: true,
  tipoVacuna: true,
  unidadEducativa: true,
  destacado: true,
  publicadoEn: true,
  actualizadoEn: true,
  unidad: { select: { nombre: true } },
  imagenes: { select: { url: true }, orderBy: { orden: 'asc' } },
} satisfies Prisma.PublicacionSelect;
type Fila = Prisma.PublicacionGetPayload<{ select: typeof SELECT }>;

// shortcut: la zona del municipio queda fija (Bolivia, UTC-4 sin horario de verano); parametrizar si se atiende otra.
const ZONA = 'America/La_Paz';
/** Hoy en la zona del municipio, como valor `date` (medianoche UTC). */
const hoy = () =>
  new Date(`${new Date().toLocaleDateString('en-CA', { timeZone: ZONA })}T00:00:00Z`);

/**
 * Vigente (el documento no lo define): la actividad no terminó. Termina en `fechaFin` o, si no tiene, en `fechaInicio`.
 * Una publicación con inicio futuro sí es vigente: el habitante debe verla con anticipación.
 */
const vigente = (h: Date): Prisma.PublicacionWhereInput => ({
  OR: [{ fechaFin: { gte: h } }, { fechaFin: null, fechaInicio: { gte: h } }],
});

/** Tipo que RF-16 muestra en la pantalla principal (RF-14: comunicados sanitarios y de emergencia). */
export const TIPO_DESTACABLE = 'COMUNICADO_SANITARIO';

const aDtoPublico = (p: Fila) => ({
  id: p.id,
  modulo: p.modulo,
  tipo: p.tipo,
  titulo: p.titulo,
  detalle: p.detalle,
  fechaInicio: p.fechaInicio?.toISOString().slice(0, 10) ?? null,
  fechaFin: p.fechaFin?.toISOString().slice(0, 10) ?? null,
  hora: p.hora?.toISOString().slice(11, 16) ?? null,
  lugar: p.lugar,
  poblacionObjetivo: p.poblacionObjetivo,
  requisitos: p.requisitos,
  tipoVacuna: p.tipoVacuna,
  unidadEducativa: p.unidadEducativa,
  destacado: p.destacado,
  unidad: p.unidad.nombre,
  imagenes: p.imagenes.map((i) => i.url),
  publicadoEn: p.publicadoEn,
  actualizadoEn: p.actualizadoEn,
});

/** Validador de caché: cambia si cambia una fila, el conjunto devuelto o el día (la vigencia depende de él). */
function etag(filas: Fila[], h: Date) {
  const hash = createHash('sha1').update(h.toISOString().slice(0, 10));
  for (const p of filas) hash.update(`|${p.id}:${p.actualizadoEn.getTime()}`);
  return `W/"${hash.digest('base64url')}"`;
}

/** `generadoEn` = hora del servidor: la app la guarda como "Última actualización" (RF-31). */
const respuesta = (filas: Fila[], h: Date) => {
  const datos = filas.map(aDtoPublico);
  return { etag: etag(filas, h), datos, generadoEn: new Date() };
};

const PUBLICADO = { estado: 'PUBLICADO' } as const;

/** RF-15: publicaciones publicadas y vigentes; las próximas primero, luego las más recientes. */
export async function listar(q: ListarPublicasInput) {
  const h = hoy();
  const filas = await prisma.publicacion.findMany({
    where: {
      ...PUBLICADO,
      ...vigente(h),
      ...(q.modulo && { modulo: q.modulo }),
      ...(q.tipo && { tipo: q.tipo }),
    },
    select: SELECT,
    orderBy: [{ fechaInicio: 'asc' }, { hora: 'asc' }, { publicadoEn: 'desc' }, { id: 'asc' }],
    take: q.limite,
    skip: q.desplazamiento,
  });
  const { datos, ...r } = respuesta(filas, h);
  return { etag: r.etag, cuerpo: { datos, generadoEn: r.generadoEn } };
}

/** RF-16: comunicados destacados y vigentes, los más recientes primero. */
export async function destacadas() {
  const h = hoy();
  const filas = await prisma.publicacion.findMany({
    where: { ...PUBLICADO, ...vigente(h), destacado: true, tipo: TIPO_DESTACABLE },
    select: SELECT,
    orderBy: [{ publicadoEn: 'desc' }, { id: 'asc' }],
  });
  const { datos, ...r } = respuesta(filas, h);
  return { etag: r.etag, cuerpo: { datos, generadoEn: r.generadoEn } };
}

/** Detalle: solo PUBLICADO (aunque su fecha haya pasado); archivada o no publicada, 404 sin distinguir. */
export async function detalle(id: string) {
  const p = await prisma.publicacion.findFirst({ where: { id, ...PUBLICADO }, select: SELECT });
  if (!p) throw new ErrorHttp(404, 'La publicación no está disponible');
  const { datos, ...r } = respuesta([p], hoy());
  return { etag: r.etag, cuerpo: { publicacion: datos[0], generadoEn: r.generadoEn } };
}
