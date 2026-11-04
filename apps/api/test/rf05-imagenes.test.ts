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
  `https://res.cloudinary.com/${NUBE}/image/upload/${publicId}.${ext}`;
const firma = (t: string, id = pubId) =>
  request(a).post(`/api/v1/panel/publicaciones/${id}/imagenes/firma`).set(auth(t));
const registrar = (t: string, body: object, id = pubId) =>
  request(a).post(`/api/v1/panel/publicaciones/${id}/imagenes`).set(auth(t)).send(body);
/** Un public_id válido tal como lo dejaría una subida firmada. */
const nuevoPublicId = async (_i = 0, id = pubId) => (await firma(pub, id)).body.public_id as string;

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
    expect(firmados.public_id).toMatch(new RegExp(`^colpa/test/${pubId}/[0-9a-f-]{36}$`));
    expect(firmados.folder).toBeUndefined();
    expect(firmados.overwrite).toBe(false);
    const esperado = createHash('sha1')
      .update(
        `allowed_formats=${firmados.allowed_formats}&overwrite=false&public_id=${firmados.public_id}&timestamp=${firmados.timestamp}${SECRETO}`,
      )
      .digest('hex');
    expect(signature).toBe(esperado);
    expect(JSON.stringify(res.body)).not.toContain(SECRETO);
  });

  it('asocia la imagen y es visible en el detalle de la publicación', async () => {
    const publicId = await nuevoPublicId();
    const res = await registrar(pub, { publicId, formato: 'jpg' });
    expect(res.status).toBe(201);
    const propio = await api.obtener(a, pub, pubId);
    expect(propio.body.imagenes).toEqual([
      expect.objectContaining({ publicId, url: url(publicId), orden: 0 }),
    ]);
  });

  it('rechaza formato no admitido, carpeta ajena, id mal formado y duplicados', async () => {
    const publicId = await nuevoPublicId();
    const pubOtro = (await api.crear(a, pub)).body.id;
    const ajeno = await nuevoPublicId(1, pubOtro);
    const casos = [
      { publicId, formato: 'gif' },
      { publicId, formato: 'exe' },
      { publicId },
      { publicId: ajeno, formato: 'jpg' },
      { publicId: `${publicId}/../../x`, formato: 'jpg' },
      { publicId: publicId.replace(/[0-9a-f]$/, 'z'), formato: 'jpg' },
      { publicId: `colpa/test/${pubId}/a`, formato: 'jpg' },
    ];
    for (const c of casos) expect((await registrar(pub, c)).status).toBe(400);
    expect(await prisma.imagen.count()).toBe(0);

    expect((await registrar(pub, { publicId, formato: 'jpg' })).status).toBe(201);
    expect((await registrar(pub, { publicId, formato: 'jpg' })).status).toBe(409);
  });

  it('rechaza el payload con URL de cliente (traversal) y guarda la URL construida por el servidor', async () => {
    const malo = {
      publicId: `colpa/test/${pubId}/a`,
      url: 'https://res.cloudinary.com/colpa/image/upload/../../../attacker/image/upload/x.jpg?/...',
    };
    expect((await registrar(pub, malo)).status).toBe(400);
    const publicId = await nuevoPublicId();
    const res = await registrar(pub, { publicId, formato: 'png', url: 'https://evil.test/x.png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe(url(publicId, 'png'));
    expect((await prisma.imagen.findUniqueOrThrow({ where: { publicId } })).url).toBe(
      url(publicId, 'png'),
    );
  });

  it('el orden sigue siendo único y la nueva queda al final tras borrar la primera', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const p = await nuevoPublicId(i);
      ids.push((await registrar(pub, { publicId: p, formato: 'jpg' })).body.id);
    }
    await request(a)
      .delete(`/api/v1/panel/publicaciones/${pubId}/imagenes/${ids[0]}`)
      .set(auth(pub));
    const p = await nuevoPublicId(9);
    expect((await registrar(pub, { publicId: p, formato: 'jpg' })).status).toBe(201);
    const ordenes = (await prisma.imagen.findMany({ orderBy: { orden: 'asc' } })).map(
      (i) => i.orden,
    );
    expect(ordenes).toEqual([1, 2]);
  });

  it('firmar con el tope alcanzado responde 409', async () => {
    for (let i = 0; i < MAX_IMAGENES; i++) {
      await registrar(pub, { publicId: await nuevoPublicId(i), formato: 'jpg' });
    }
    expect((await firma(pub)).status).toBe(409);
  });

  it(`admite como máximo ${MAX_IMAGENES} imágenes por publicación`, async () => {
    const extra = await nuevoPublicId(99); // emitido antes del tope: firmar con el tope ya da 409
    for (let i = 0; i < MAX_IMAGENES; i++) {
      const p = await nuevoPublicId(i);
      expect((await registrar(pub, { publicId: p, formato: 'jpg' })).status).toBe(201);
    }
    expect((await registrar(pub, { publicId: extra, formato: 'jpg' })).status).toBe(409);
    expect(await prisma.imagen.count()).toBe(MAX_IMAGENES);
  });

  it('elimina una imagen del borrador', async () => {
    const publicId = await nuevoPublicId();
    const { body } = await registrar(pub, { publicId, formato: 'jpg' });
    const del = await request(a)
      .delete(`/api/v1/panel/publicaciones/${pubId}/imagenes/${body.id}`)
      .set(auth(pub));
    expect(del.status).toBe(204);
    expect(await prisma.imagen.count()).toBe(0);
  });

  it('solo en Borrador y solo de la propia unidad', async () => {
    const publicId = await nuevoPublicId();
    expect((await firma(otra)).status).toBe(404);
    expect((await registrar(otra, { publicId, formato: 'jpg' })).status).toBe(404);
    expect((await firma(apr)).status).toBe(403);

    const { body } = await registrar(pub, { publicId, formato: 'jpg' });
    const p2 = await nuevoPublicId(2);
    await api.accion(a, pub, pubId, 'enviar');
    expect((await registrar(pub, { publicId: p2, formato: 'jpg' })).status).toBe(409);
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
