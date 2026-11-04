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
const firmar = (params: Record<string, string | number>, secreto: string) =>
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

/** RF-05: parámetros de subida firmada; el móvil sube directo a Cloudinary y luego registra la imagen. */
export async function firmaSubida(publicacionId: string, f: Actor) {
  const c = credenciales();
  await prisma.$transaction((tx) => borradorPropio(tx, publicacionId, f));
  const firmados = {
    allowed_formats: FORMATOS_IMAGEN.join(','),
    folder: carpetaDe(c.carpeta, publicacionId),
    public_id: randomUUID(),
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

/** Registra una imagen ya subida; debe pertenecer a nuestra nube y a la carpeta de esta publicación. */
export function registrar(publicacionId: string, d: RegistrarImagenInput, f: Actor) {
  const c = credenciales();
  const prefijo = `${carpetaDe(c.carpeta, publicacionId)}/`;
  const ext = d.url.split('.').pop()?.toLowerCase() ?? '';
  const urlOk =
    d.url.startsWith(`https://res.cloudinary.com/${c.cloudName}/image/upload/`) &&
    d.url.includes(`/${d.publicId}.`) &&
    (FORMATOS_IMAGEN as readonly string[]).includes(ext);
  const idOk = d.publicId.startsWith(prefijo) && /^[\w-]+$/.test(d.publicId.slice(prefijo.length));
  if (!urlOk || !idOk)
    throw new ErrorHttp(400, 'Imagen no admitida: formato o ubicación inválidos');

  return prisma.$transaction(async (tx) => {
    await borradorPropio(tx, publicacionId, f); // bloquea la fila: el tope de imágenes no se sortea en paralelo
    const total = await tx.imagen.count({ where: { publicacionId } });
    if (total >= MAX_IMAGENES)
      throw new ErrorHttp(409, `Máximo ${MAX_IMAGENES} imágenes por publicación`);
    try {
      return await tx.imagen.create({
        data: { publicacionId, url: d.url, publicId: d.publicId, orden: total },
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
