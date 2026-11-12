import request from 'supertest';
import { prisma } from '../src/db';
import {
  api,
  app,
  auditoriaDe,
  auth,
  borradorDirecto,
  crearFuncionario,
  crearUnidad,
  FICHA,
  limpiar,
  token,
} from './helpers';

const a = app();
const L = '/api/v1/publicaciones';
const P = '/api/v1/panel/publicaciones';
let unidadId: string;
let autorId: string;
let tPub: string;
let tApr: string;

const dia = (d: number) => new Date(Date.now() + d * 86_400_000);
const dato = (d: number) => dia(d).toISOString().slice(0, 10);

const COMUNICADO = {
  ...FICHA,
  tipo: 'COMUNICADO_SANITARIO',
  titulo: 'Alerta sanitaria',
  fechaInicio: dato(5),
  tipoVacuna: undefined,
};

/** Flujo real: Publicador crea y envía, Aprobador publica. Devuelve el id. */
async function publicada(ficha: object = COMUNICADO) {
  const id = (await api.crear(a, tPub, ficha)).body.id as string;
  await api.accion(a, tPub, id, 'enviar');
  await api.accion(a, tApr, id, 'publicar');
  return id;
}

/** Flujo real con imágenes y observaciones: crear, enviar, devolver, re-enviar, publicar. Devuelve id y URLs en orden. */
async function publicadaConImagenes() {
  const id = (await api.crear(a, tPub, COMUNICADO)).body.id as string;
  const urls: string[] = [];
  for (let i = 0; i < 2; i++) {
    const publicId = (await request(a).post(`${P}/${id}/imagenes/firma`).set(auth(tPub))).body
      .public_id as string;
    const r = await request(a)
      .post(`${P}/${id}/imagenes`)
      .set(auth(tPub))
      .send({ publicId, formato: 'jpg' });
    urls.push(r.body.url as string);
  }
  await api.accion(a, tPub, id, 'enviar');
  await api.accion(a, tApr, id, 'devolver', { observaciones: 'interno' });
  await api.accion(a, tPub, id, 'enviar');
  await api.accion(a, tApr, id, 'publicar');
  return { id, urls };
}
const ids = (res: { body: { datos: { id: string }[] } }) => res.body.datos.map((p) => p.id);

/** Fila directa en la BD: solo para estados/fechas inalcanzables por la API (pasado, imágenes con URL fija). */
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
  await crearFuncionario(unidadId, 'APROBADOR', 'apr');
  tPub = await token(a, 'pub');
  tApr = await token(a, 'apr');
});
afterAll(() => prisma.$disconnect());

describe('RF-14 Destacar comunicado sanitario o de emergencia', () => {
  it('el Publicador crea un comunicado sanitario destacado', async () => {
    const res = await api.crear(a, tPub, { ...COMUNICADO, destacado: true });
    expect(res.status).toBe(201);
    expect(res.body.destacado).toBe(true);
  });

  it('por defecto no es destacado', async () => {
    expect((await api.crear(a, tPub, COMUNICADO)).body.destacado).toBe(false);
  });

  it('destacado en otro tipo responde 400 nombrando el campo, al crear y al editar', async () => {
    const c = await api.crear(a, tPub, { ...FICHA, destacado: true });
    expect(c.status).toBe(400);
    expect(c.body.campos).toHaveProperty('destacado');
    const id = (await api.crear(a, tPub)).body.id as string;
    const e = await api.editar(a, tPub, id, { destacado: true });
    expect(e.status).toBe(400);
    expect(e.body.campos).toHaveProperty('destacado');
    expect((await api.obtener(a, tPub, id)).body.destacado).toBe(false);
  });

  it('se marca y desmarca editando el borrador, y no se edita tras enviarlo', async () => {
    const id = (await api.crear(a, tPub, COMUNICADO)).body.id as string;
    expect((await api.editar(a, tPub, id, { destacado: true })).body.destacado).toBe(true);
    expect((await api.editar(a, tPub, id, { destacado: false })).body.destacado).toBe(false);
    await api.accion(a, tPub, id, 'enviar');
    expect((await api.editar(a, tPub, id, { destacado: true })).status).toBe(409);
  });

  it('editar otro campo no desmarca un comunicado destacado y audita una sola edición', async () => {
    const id = (await api.crear(a, tPub, { ...COMUNICADO, destacado: true })).body.id as string;
    expect((await api.editar(a, tPub, id, { titulo: 'Nuevo título' })).status).toBe(200);
    const p = (await api.obtener(a, tPub, id)).body;
    expect(p.destacado).toBe(true);
    expect(p.titulo).toBe('Nuevo título');
    expect((await auditoriaDe(id)).filter((r) => r.accion === 'EDITAR')).toHaveLength(1);
  });

  it('un valor no booleano responde 400', async () => {
    expect((await api.crear(a, tPub, { ...COMUNICADO, destacado: 'si' })).status).toBe(400);
  });
});

describe('RF-15 Consultar publicaciones de salud', () => {
  it('lista solo las PUBLICADO del módulo de salud, sin autenticación', async () => {
    const ok = await publicada({ ...FICHA, fechaInicio: dato(5) });
    await api.crear(a, tPub, { ...FICHA, fechaInicio: dato(5) }); // BORRADOR
    const enRevision = (await api.crear(a, tPub, { ...FICHA, fechaInicio: dato(5) })).body.id;
    await api.accion(a, tPub, enRevision, 'enviar');
    const archivada = await publicada({ ...FICHA, fechaInicio: dato(5) });
    await api.accion(a, tApr, archivada, 'archivar');
    const res = await request(a).get(L).query({ modulo: 'SALUD' });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([ok]);
    expect(new Date(res.body.generadoEn).getTime()).not.toBeNaN();
  });

  it('expone solo campos aptos para el ciudadano y las imágenes en orden', async () => {
    const { id, urls } = await publicadaConImagenes();
    const lista = await request(a).get(L);
    const detalle = await request(a).get(`${L}/${id}`);
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
      expect(item.imagenes).toEqual(
        urls.map((u) => u.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1080/')),
      );
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

  it('vigencia en el borde: a las 22:00 del 4-nov en La Paz (UTC ya es 5-nov) aún vale el día 4', async () => {
    const dia4 = new Date('2026-11-04T00:00:00Z');
    const vig = await crear({
      titulo: 'Fin hoy',
      fechaInicio: new Date('2026-11-01T00:00:00Z'),
      fechaFin: dia4,
    });
    const venc = await crear({
      titulo: 'Fin ayer',
      fechaInicio: new Date('2026-11-01T00:00:00Z'),
      fechaFin: new Date('2026-11-03T00:00:00Z'),
    });
    const sinFin = await crear({ titulo: 'Solo hoy', fechaInicio: dia4 });
    // Solo se falsea Date: el cliente de BD necesita los temporizadores reales.
    jest.useFakeTimers({
      now: new Date('2026-11-05T02:00:00Z'),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'queueMicrotask',
        'performance',
        'hrtime',
      ],
    });
    try {
      const res = await request(a).get(L);
      expect(ids(res).sort()).toEqual([vig.id, sinFin.id].sort());
      expect(ids(res)).not.toContain(venc.id);
    } finally {
      jest.useRealTimers();
    }
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
      expect(r1.headers['cache-control']).toBe(
        'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      );
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
  const destacada = (extra: object = {}) => publicada({ ...COMUNICADO, destacado: true, ...extra });
  const vencer = (id: string) =>
    prisma.publicacion.update({
      where: { id },
      data: { fechaInicio: new Date(`${dato(-9)}T00:00:00Z`), fechaFin: null },
    });

  it('devuelve solo comunicados sanitarios PUBLICADO, destacados y vigentes, sin autenticación', async () => {
    const ok = await destacada({ titulo: 'Alerta' });
    const archivado = await destacada();
    await api.accion(a, tApr, archivado, 'archivar');
    await api.crear(a, tPub, { ...COMUNICADO, destacado: true }); // BORRADOR
    await vencer(await destacada()); // vencido
    await publicada(COMUNICADO); // comunicado sin destacar
    await publicada({ ...FICHA, fechaInicio: dato(5) }); // otro tipo (no puede destacarse)
    const res = await request(a).get(`${L}/destacadas`);
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([ok]);
    expect(res.body.datos[0].destacado).toBe(true);
    expect(res.body.datos[0]).not.toHaveProperty('autorId');
    expect(res.body.datos[0]).not.toHaveProperty('observaciones');
  });

  it('un comunicado con fecha fin futura sigue vigente aunque su inicio sea pasado', async () => {
    const id = await destacada();
    await prisma.publicacion.update({
      where: { id },
      data: {
        fechaInicio: new Date(`${dato(-9)}T00:00:00Z`),
        fechaFin: new Date(`${dato(1)}T00:00:00Z`),
      },
    });
    expect(ids(await request(a).get(`${L}/destacadas`))).toEqual([id]);
  });

  it('muestra como máximo 10, los más recientes primero', async () => {
    const creados: string[] = [];
    for (let i = 0; i < 11; i++) creados.push(await destacada());
    const res = await request(a).get(`${L}/destacadas`);
    expect(ids(res)).toEqual(creados.slice(1).reverse());
  });

  it('sin destacados devuelve lista vacía (la app oculta la sección)', async () => {
    const res = await request(a).get(`${L}/destacadas`);
    expect(res.status).toBe(200);
    expect(res.body.datos).toEqual([]);
  });

  it('ETag: responde 304 si no cambió', async () => {
    await destacada();
    const r1 = await request(a).get(`${L}/destacadas`);
    expect(r1.headers['cache-control']).toBe(
      'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
    );
    const r2 = await request(a)
      .get(`${L}/destacadas`)
      .set('If-None-Match', r1.headers['etag'] as string);
    expect(r2.status).toBe(304);
  });

  it('ETag: cambia si cambia el nombre de la unidad', async () => {
    await destacada();
    const antes = (await request(a).get(`${L}/destacadas`)).headers['etag'];
    await prisma.unidad.update({ where: { id: unidadId }, data: { nombre: 'Otra unidad' } });
    const r = await request(a)
      .get(`${L}/destacadas`)
      .set('If-None-Match', antes as string);
    expect(r.status).toBe(200);
    expect(r.headers['etag']).not.toBe(antes);
  });
});
