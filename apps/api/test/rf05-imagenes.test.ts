import { createHash } from 'node:crypto';
import request from 'supertest';
import { MAX_IMAGENES } from '@colpa/shared';
import { prisma } from '../src/db';
import { api, app, auth, crearFuncionario, crearUnidad, limpiar, token } from './helpers';

const a = app();
const NUBE = process.env.CLOUDINARY_CLOUD_NAME!;
const SECRETO = process.env.CLOUDINARY_API_SECRET!;
let pub: string;
let apr: string;
let otra: string;
let pubId: string;

const url = (publicId: string, ext = 'jpg') =>
  `https://res.cloudinary.com/${NUBE}/image/upload/v1/${publicId}.${ext}`;
const firma = (t: string, id = pubId) =>
  request(a).post(`/api/v1/panel/publicaciones/${id}/imagenes/firma`).set(auth(t));
const registrar = (t: string, body: object, id = pubId) =>
  request(a).post(`/api/v1/panel/publicaciones/${id}/imagenes`).set(auth(t)).send(body);
/** Un public_id válido tal como lo dejaría una subida firmada. */
const nuevoPublicId = async (i = 0, id = pubId) => `${(await firma(pub, id)).body.folder}/img${i}`;

beforeEach(async () => {
  await limpiar();
  const u = (await crearUnidad('Salud')).id;
  const u2 = (await crearUnidad('Educacion')).id;
  await crearFuncionario(u, 'PUBLICADOR', 'pub');
  await crearFuncionario(u, 'APROBADOR', 'apr');
  await crearFuncionario(u2, 'PUBLICADOR', 'pub2');
  [pub, apr, otra] = await Promise.all([token(a, 'pub'), token(a, 'apr'), token(a, 'pub2')]);
  pubId = (await api.crear(a, pub)).body.id;
});
afterAll(() => prisma.$disconnect());

describe('RF-05 Adjuntar imágenes a la publicación', () => {
  it('firma la subida con parámetros que Cloudinary verificaría (sin red)', async () => {
    const res = await firma(pub);
    expect(res.status).toBe(200);
    const { signature, apiKey, cloudName, maxImagenes, ...firmados } = res.body;
    expect(apiKey).toBe(process.env.CLOUDINARY_API_KEY);
    expect(cloudName).toBe(NUBE);
    expect(maxImagenes).toBe(MAX_IMAGENES);
    expect(firmados.folder).toBe(`colpa/test/${pubId}`);
    const esperado = createHash('sha1')
      .update(
        `allowed_formats=${firmados.allowed_formats}&folder=${firmados.folder}&public_id=${firmados.public_id}&timestamp=${firmados.timestamp}${SECRETO}`,
      )
      .digest('hex');
    expect(signature).toBe(esperado);
    expect(JSON.stringify(res.body)).not.toContain(SECRETO);
  });

  it('asocia la imagen y es visible en el detalle de la publicación', async () => {
    const publicId = await nuevoPublicId();
    const res = await registrar(pub, { publicId, url: url(publicId) });
    expect(res.status).toBe(201);
    const propio = await api.obtener(a, pub, pubId);
    expect(propio.body.imagenes).toEqual([
      expect.objectContaining({ publicId, url: url(publicId), orden: 0 }),
    ]);
  });

  it('rechaza formato no admitido, otra nube, carpeta de otra publicación y duplicados', async () => {
    const publicId = await nuevoPublicId();
    const pubOtro = (await api.crear(a, pub)).body.id;
    const ajeno = await nuevoPublicId(1, pubOtro);
    const casos = [
      { publicId, url: url(publicId, 'gif') },
      { publicId, url: url(publicId, 'exe') },
      { publicId, url: url(publicId).replace(NUBE, 'otra-nube') },
      { publicId, url: url(publicId).replace('https', 'http') },
      { publicId: ajeno, url: url(ajeno) },
      { publicId: `${publicId}/../../x`, url: url(publicId) },
    ];
    for (const c of casos) expect((await registrar(pub, c)).status).toBe(400);
    expect(await prisma.imagen.count()).toBe(0);

    expect((await registrar(pub, { publicId, url: url(publicId) })).status).toBe(201);
    expect((await registrar(pub, { publicId, url: url(publicId) })).status).toBe(409);
  });

  it(`admite como máximo ${MAX_IMAGENES} imágenes por publicación`, async () => {
    for (let i = 0; i < MAX_IMAGENES; i++) {
      const p = await nuevoPublicId(i);
      expect((await registrar(pub, { publicId: p, url: url(p) })).status).toBe(201);
    }
    const extra = await nuevoPublicId(99);
    expect((await registrar(pub, { publicId: extra, url: url(extra) })).status).toBe(409);
    expect(await prisma.imagen.count()).toBe(MAX_IMAGENES);
  });

  it('elimina una imagen del borrador', async () => {
    const publicId = await nuevoPublicId();
    const { body } = await registrar(pub, { publicId, url: url(publicId) });
    const del = await request(a)
      .delete(`/api/v1/panel/publicaciones/${pubId}/imagenes/${body.id}`)
      .set(auth(pub));
    expect(del.status).toBe(204);
    expect(await prisma.imagen.count()).toBe(0);
  });

  it('solo en Borrador y solo de la propia unidad', async () => {
    const publicId = await nuevoPublicId();
    expect((await firma(otra)).status).toBe(404);
    expect((await registrar(otra, { publicId, url: url(publicId) })).status).toBe(404);
    expect((await firma(apr)).status).toBe(403);

    const { body } = await registrar(pub, { publicId, url: url(publicId) });
    const p2 = await nuevoPublicId(2);
    await api.accion(a, pub, pubId, 'enviar');
    expect((await registrar(pub, { publicId: p2, url: url(p2) })).status).toBe(409);
    expect((await firma(pub)).status).toBe(409);
    expect(
      (
        await request(a)
          .delete(`/api/v1/panel/publicaciones/${pubId}/imagenes/${body.id}`)
          .set(auth(pub))
      ).status,
    ).toBe(409);
    expect(await prisma.imagen.count()).toBe(1);
  });
});
