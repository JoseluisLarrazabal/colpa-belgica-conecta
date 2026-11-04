import { createHash, randomUUID } from 'node:crypto';
import { FORMATOS_IMAGEN, MAX_IMAGENES, type RegistrarImagenInput } from '@colpa/shared';
import { cloudinary } from '../config';
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/error';
import { Prisma } from '../generated/prisma/client';
import { borradorPropio, type Actor } from './publicacion.service';

function credenciales() {
  const c = cloudinary();
  if (!c) throw new ErrorHttp(503, 'La carga de imágenes no está configurada');
  return c;
}

/** Cloudinary: parámetros ordenados `k=v&...` + secreto, SHA-1 hex (sin llamada de red). */
const firmar = (params: Record<string, string | number | boolean>, secreto: string) =>
  createHash('sha1')
    .update(
      Object.entries(params)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => `${k}=${v}`)
        .join('&') + secreto,
    )
    .digest('hex');

/** Carpeta propia de cada publicación: ata el archivo subido a esta publicación. */
const carpetaDe = (base: string, publicacionId: string) => `${base}/${publicacionId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const topeExcedido = () => new ErrorHttp(409, `Máximo ${MAX_IMAGENES} imágenes por publicación`);

/**
 * RF-05: parámetros de subida firmada; el móvil sube directo a Cloudinary y luego registra la imagen.
 * `public_id` lleva la ruta completa (sin `folder`): funciona igual en modo de carpetas fijo y dinámico.
 */
// shortcut: el límite se valida al firmar y al registrar; firmas repetidas pueden dejar archivos huérfanos en Cloudinary hasta implementar limpieza (destroy) — aceptable para ~20 funcionarios.
export async function firmaSubida(publicacionId: string, f: Actor) {
  const c = credenciales();
  const p = await prisma.publicacion.findUnique({
    where: { id: publicacionId },
    select: { unidadId: true, estado: true, _count: { select: { imagenes: true } } },
  });
  if (!p || p.unidadId !== f.unidadId) throw new ErrorHttp(404, 'La publicación no existe');
  if (p.estado !== 'BORRADOR') {
    throw new ErrorHttp(409, 'Solo se puede modificar una publicación en Borrador');
  }
  if (p._count.imagenes >= MAX_IMAGENES) throw topeExcedido();
  const firmados = {
    allowed_formats: FORMATOS_IMAGEN.join(','),
    overwrite: false, // una firma reutilizada no puede reemplazar una imagen ya aprobada
    public_id: `${carpetaDe(c.carpeta, publicacionId)}/${randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    cloudName: c.cloudName,
    apiKey: c.apiKey,
    ...firmados,
    signature: firmar(firmados, c.apiSecret),
    maxImagenes: MAX_IMAGENES,
  };
}

/** Registra una imagen ya subida: solo el public_id emitido al firmar; la URL la construye el servidor. */
export function registrar(publicacionId: string, d: RegistrarImagenInput, f: Actor) {
  const c = credenciales();
  const prefijo = `${carpetaDe(c.carpeta, publicacionId)}/`;
  if (!d.publicId.startsWith(prefijo) || !UUID.test(d.publicId.slice(prefijo.length)))
    throw new ErrorHttp(400, 'Imagen no admitida: identificador inválido');
  const url = `https://res.cloudinary.com/${c.cloudName}/image/upload/${d.publicId}.${d.formato}`;

  return prisma.$transaction(async (tx) => {
    await borradorPropio(tx, publicacionId, f); // bloquea la fila: el tope de imágenes no se sortea en paralelo
    const total = await tx.imagen.count({ where: { publicacionId } });
    if (total >= MAX_IMAGENES) throw topeExcedido();
    const { _max } = await tx.imagen.aggregate({ where: { publicacionId }, _max: { orden: true } });
    try {
      return await tx.imagen.create({
        data: { publicacionId, url, publicId: d.publicId, orden: (_max.orden ?? -1) + 1 },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErrorHttp(409, 'La imagen ya está registrada');
      }
      throw e;
    }
  });
}

// shortcut: no se borra el archivo en Cloudinary (requiere red); migrar a una purga periódica por public_id huérfano.
export const eliminar = (publicacionId: string, imagenId: string, f: Actor) =>
  prisma.$transaction(async (tx) => {
    await borradorPropio(tx, publicacionId, f);
    const { count } = await tx.imagen.deleteMany({ where: { id: imagenId, publicacionId } });
    if (!count) throw new ErrorHttp(404, 'La imagen no existe');
  });
