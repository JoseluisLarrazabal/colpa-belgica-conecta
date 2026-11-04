import request from 'supertest';
import { prisma } from '../src/db';
import { app, borradorDirecto, crearFuncionario, crearUnidad, limpiar } from './helpers';

const a = app();
const L = '/api/v1/publicaciones';
let unidadId: string;
let autorId: string;

const dia = (d: number) => new Date(Date.now() + d * 86_400_000);
const dato = (d: number) => dia(d).toISOString().slice(0, 10);

/** Fila directa en la BD (la ficha de entrada no admite pasado ni destacado). */
const crear = (extra: object = {}) =>
  borradorDirecto(unidadId, autorId, {
    titulo: 'Jornada de salud',
    estado: 'PUBLICADO',
    publicadoEn: new Date(),
    fechaInicio: new Date(`${dato(5)}T00:00:00Z`),
    ...extra,
  });

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad('Dirección de Salud')).id;
  autorId = (await crearFuncionario(unidadId, 'PUBLICADOR', 'pub')).id;
});
afterAll(() => prisma.$disconnect());

describe('RF-15 Consultar publicaciones de salud', () => {
  it('lista solo las PUBLICADO, sin autenticación', async () => {
    const ok = await crear({ titulo: 'Visible' });
    for (const estado of ['BORRADOR', 'EN_REVISION', 'ARCHIVADO']) await crear({ estado });
    const res = await request(a).get(L);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((p: { id: string }) => p.id)).toEqual([ok.id]);
    expect(new Date(res.body.generadoEn).getTime()).not.toBeNaN();
  });

  it('expone solo campos aptos para el ciudadano y las imágenes en orden', async () => {
    const p = await crear({ observaciones: 'interno', detalle: 'Texto' });
    await prisma.imagen.createMany({
      data: [
        { publicacionId: p.id, url: 'https://x/2.jpg', publicId: 'b', orden: 1 },
        { publicacionId: p.id, url: 'https://x/1.jpg', publicId: 'a', orden: 0 },
      ],
    });
    const lista = await request(a).get(L);
    const detalle = await request(a).get(`${L}/${p.id}`);
    for (const item of [lista.body.datos[0], detalle.body.publicacion]) {
      expect(Object.keys(item).sort()).toEqual(
        [
          'actualizadoEn',
          'destacado',
          'detalle',
          'fechaFin',
          'fechaInicio',
          'hora',
          'id',
          'imagenes',
          'lugar',
          'modulo',
          'poblacionObjetivo',
          'publicadoEn',
          'requisitos',
          'tipo',
          'tipoVacuna',
          'titulo',
          'unidad',
          'unidadEducativa',
        ].sort(),
      );
      expect(item.unidad).toBe('Dirección de Salud');
      expect(item.imagenes).toEqual(['https://x/1.jpg', 'https://x/2.jpg']);
    }
    expect(Object.keys(detalle.body).sort()).toEqual(['generadoEn', 'publicacion']);
  });

  it('filtra por módulo y por tipo, y rechaza un tipo ajeno al módulo', async () => {
    const salud = await crear();
    await crear({ modulo: 'EDUCACION', tipo: 'ACTIVIDAD_ESCOLAR' });
    const m = await request(a).get(L).query({ modulo: 'SALUD' });
    expect(m.body.datos.map((p: { id: string }) => p.id)).toEqual([salud.id]);
    const t = await request(a).get(L).query({ tipo: 'ACTIVIDAD_ESCOLAR' });
    expect(t.body.datos).toHaveLength(1);
    expect((await request(a).get(L).query({ modulo: 'XX' })).status).toBe(400);
    expect((await request(a).get(L).query({ modulo: 'SALUD', tipo: 'FERIA' })).status).toBe(400);
    expect((await request(a).get(L).query({ limite: 1000 })).status).toBe(400);
  });

  it('solo muestra las vigentes y ordena las próximas primero', async () => {
    await crear({ titulo: 'Terminó', fechaInicio: new Date(`${dato(-9)}T00:00:00Z`) });
    await crear({
      titulo: 'En curso',
      fechaInicio: new Date(`${dato(-3)}T00:00:00Z`),
      fechaFin: new Date(`${dato(2)}T00:00:00Z`),
    });
    await crear({ titulo: 'Lejana', fechaInicio: new Date(`${dato(20)}T00:00:00Z`) });
    await crear({ titulo: 'Cercana', fechaInicio: new Date(`${dato(4)}T00:00:00Z`) });
    const res = await request(a).get(L);
    expect(res.body.datos.map((p: { titulo: string }) => p.titulo)).toEqual([
      'En curso',
      'Cercana',
      'Lejana',
    ]);
  });

  it('el detalle de una PUBLICADO responde 200 aunque su fecha haya pasado', async () => {
    const p = await crear({ fechaInicio: new Date(`${dato(-30)}T00:00:00Z`) });
    const res = await request(a).get(`${L}/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.publicacion.id).toBe(p.id);
  });

  it('el detalle responde 404 si no está PUBLICADO o no existe, y 400 con id inválido', async () => {
    for (const estado of ['BORRADOR', 'EN_REVISION', 'ARCHIVADO']) {
      const p = await crear({ estado });
      expect((await request(a).get(`${L}/${p.id}`)).status).toBe(404);
    }
    expect((await request(a).get(`${L}/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
    expect((await request(a).get(`${L}/no-es-uuid`)).status).toBe(400);
  });

  it('ETag: revalida con 304 sin cuerpo y cambia al modificarse una publicación', async () => {
    const p = await crear();
    for (const url of [L, `${L}/${p.id}`]) {
      const r1 = await request(a).get(url);
      expect(r1.headers['cache-control']).toBe('no-cache');
      const etag = r1.headers['etag'] as string;
      expect(etag).toBeTruthy();
      const r2 = await request(a).get(url).set('If-None-Match', etag);
      expect(r2.status).toBe(304);
      expect(r2.text).toBe('');
    }
    const antes = (await request(a).get(L)).headers['etag'];
    await prisma.publicacion.update({ where: { id: p.id }, data: { titulo: 'Cambiado' } });
    const r3 = await request(a)
      .get(L)
      .set('If-None-Match', antes as string);
    expect(r3.status).toBe(200);
    expect(r3.headers['etag']).not.toBe(antes);
  });
});

describe('RF-16 Visualizar comunicados destacados en la pantalla principal', () => {
  const comunicado = (extra: object = {}) =>
    crear({ tipo: 'COMUNICADO_SANITARIO', destacado: true, ...extra });

  it('devuelve solo comunicados sanitarios PUBLICADO, destacados y vigentes, sin autenticación', async () => {
    const ok = await comunicado({ titulo: 'Alerta' });
    await comunicado({ estado: 'ARCHIVADO' });
    await comunicado({ estado: 'BORRADOR' });
    await comunicado({ fechaInicio: new Date(`${dato(-9)}T00:00:00Z`) }); // vencido
    await comunicado({ destacado: false });
    await crear({ destacado: true }); // destacado pero no es comunicado sanitario
    const res = await request(a).get(`${L}/destacadas`);
    expect(res.status).toBe(200);
    expect(res.body.datos.map((p: { id: string }) => p.id)).toEqual([ok.id]);
    expect(res.body.datos[0].destacado).toBe(true);
    expect(res.body.datos[0]).not.toHaveProperty('autorId');
    expect(res.body.datos[0]).not.toHaveProperty('observaciones');
  });

  it('un comunicado con fecha fin futura sigue vigente aunque su inicio sea pasado', async () => {
    const c = await comunicado({
      fechaInicio: new Date(`${dato(-9)}T00:00:00Z`),
      fechaFin: new Date(`${dato(1)}T00:00:00Z`),
    });
    const res = await request(a).get(`${L}/destacadas`);
    expect(res.body.datos.map((p: { id: string }) => p.id)).toEqual([c.id]);
  });

  it('sin destacados devuelve lista vacía (la app oculta la sección)', async () => {
    const res = await request(a).get(`${L}/destacadas`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([]);
  });

  it('ETag: responde 304 si no cambió', async () => {
    await comunicado();
    const r1 = await request(a).get(`${L}/destacadas`);
    expect(r1.headers['cache-control']).toBe('no-cache');
    const r2 = await request(a)
      .get(`${L}/destacadas`)
      .set('If-None-Match', r1.headers['etag'] as string);
    expect(r2.status).toBe(304);
  });
});
