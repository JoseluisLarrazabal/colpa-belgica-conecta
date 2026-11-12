import request from 'supertest';
import { prisma } from '../src/db';
import {
  FICHA,
  api,
  app,
  auditoriaDe,
  auth,
  crearFuncionario,
  crearUnidad,
  limpiar,
  token,
} from './helpers';

const a = app();
let unidadId: string;
let pub: string;
let apr: string;
let pubOtraUnidad: string;

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad('Salud')).id;
  const otra = (await crearUnidad('Educacion')).id;
  await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
  await crearFuncionario(unidadId, 'APROBADOR', 'apr');
  await crearFuncionario(otra, 'PUBLICADOR', 'pub2');
  [pub, apr, pubOtraUnidad] = await Promise.all([
    token(a, 'pub'),
    token(a, 'apr'),
    token(a, 'pub2'),
  ]);
});
afterAll(() => prisma.$disconnect());

describe('RF-04 Elaborar publicación con ficha estructurada', () => {
  it('guarda la publicación en Borrador con su autor y unidad, y audita la creación', async () => {
    const res = await api.crear(a, pub);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      estado: 'BORRADOR',
      unidadId,
      titulo: FICHA.titulo,
      fechaInicio: '2026-12-10',
      hora: '09:30',
    });
    const filas = await auditoriaDe(res.body.id);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      accion: 'CREAR',
      funcionarioId: res.body.autorId,
      estadoResultante: 'BORRADOR',
    });
  });

  it('rechaza la ficha incompleta indicando los campos y no guarda nada', async () => {
    const incompleta = { ...FICHA, lugar: undefined, requisitos: undefined };
    const res = await api.crear(a, pub, incompleta);
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.campos)).toEqual(expect.arrayContaining(['lugar', 'requisitos']));
    expect(await prisma.publicacion.count()).toBe(0);
    expect(await prisma.registroAuditoria.count({ where: { accion: 'CREAR' } })).toBe(0);
  });

  it('rechaza un tipo que no corresponde al módulo', async () => {
    const res = await api.crear(a, pub, { ...FICHA, modulo: 'EDUCACION' });
    expect(res.status).toBe(400);
    expect(await prisma.publicacion.count()).toBe(0);
  });

  it('edita un borrador, revalida la ficha completa y audita', async () => {
    const { body } = await api.crear(a, pub);
    const ok = await api.editar(a, pub, body.id, { lugar: 'Coliseo municipal' });
    expect(ok.status).toBe(200);
    expect(ok.body.lugar).toBe('Coliseo municipal');
    expect((await auditoriaDe(body.id)).map((f) => f.accion)).toEqual(['CREAR', 'EDITAR']);
    expect((await api.editar(a, pub, body.id, { titulo: '' })).status).toBe(400);
    expect((await api.editar(a, pub, body.id, { tipo: 'FERIA' })).status).toBe(400);
  });

  it('edición: campo de otro tipo => 400 con el nombre; sin cambios reales => 200 sin auditar', async () => {
    const resto: Record<string, unknown> = { ...FICHA };
    delete resto['tipoVacuna'];
    const jornada = await api.crear(a, pub, { ...resto, tipo: 'JORNADA_ATENCION' });
    expect(jornada.status).toBe(201);
    const r = await api.editar(a, pub, jornada.body.id, { tipoVacuna: 'X' });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain('tipoVacuna');
    const { body } = await api.crear(a, pub);
    const igual = await api.editar(a, pub, body.id, {
      lugar: FICHA.lugar,
      tipoVacuna: FICHA.tipoVacuna,
    });
    expect(igual.status).toBe(200);
    expect((await auditoriaDe(body.id)).map((x) => x.accion)).toEqual(['CREAR']);
  });

  it('un Publicador de otra unidad no ve ni edita la publicación (404, sin filtrar existencia)', async () => {
    const { body } = await api.crear(a, pub);
    expect((await api.editar(a, pubOtraUnidad, body.id, { lugar: 'X' })).status).toBe(404);
    expect((await api.obtener(a, pubOtraUnidad, body.id)).status).toBe(404);
    expect(
      (await request(a).delete(`/api/v1/panel/publicaciones/${body.id}`).set(auth(pubOtraUnidad)))
        .status,
    ).toBe(404);
    expect((await prisma.publicacion.findUniqueOrThrow({ where: { id: body.id } })).lugar).toBe(
      FICHA.lugar,
    );
  });

  it('fechaFin: se guarda por PATCH y no puede ser anterior al inicio', async () => {
    const { body } = await api.crear(a, pub);
    const ok = await api.editar(a, pub, body.id, { fechaFin: '2099-01-02' });
    expect(ok.status).toBe(200);
    expect(ok.body.fechaFin).toBe('2099-01-02');
    const mal = await api.editar(a, pub, body.id, { fechaFin: '2000-01-01' });
    expect(mal.status).toBe(400);
  });

  it('fechaInicio posterior a la fechaFin guardada => 400', async () => {
    const { body } = await api.crear(a, pub);
    expect((await api.editar(a, pub, body.id, { fechaFin: '2099-01-02' })).status).toBe(200);
    const mal = await api.editar(a, pub, body.id, { fechaInicio: '2099-02-01' });
    expect(mal.status).toBe(400);
  });

  it('fechaFin: null en un borrador la borra', async () => {
    const { body } = await api.crear(a, pub);
    await api.editar(a, pub, body.id, { fechaFin: '2099-01-02' });
    const r = await api.editar(a, pub, body.id, { fechaFin: null });
    expect(r.status).toBe(200);
    expect((await api.obtener(a, pub, body.id)).body.fechaFin).toBeNull();
  });

  it('editar una publicación En revisión o Publicada responde 409', async () => {
    const { body } = await api.crear(a, pub);
    await api.accion(a, pub, body.id, 'enviar');
    expect((await api.editar(a, pub, body.id, { lugar: 'X' })).status).toBe(409);
    await api.accion(a, apr, body.id, 'publicar');
    expect((await api.editar(a, pub, body.id, { lugar: 'X' })).status).toBe(409);
  });

  it('lista por unidad: el Publicador solo ve la suya; el Aprobador, la cola En revisión de todas', async () => {
    const mia = (await api.crear(a, pub)).body.id;
    const ajena = (await api.crear(a, pubOtraUnidad)).body.id;
    const ids = async (t: string, q = '') =>
      (
        (await request(a).get(`/api/v1/panel/publicaciones${q}`).set(auth(t))).body as {
          id: string;
        }[]
      )
        .map((p) => p.id)
        .sort();
    expect(await ids(pub)).toEqual([mia]);
    expect(await ids(apr)).toEqual([]); // los borradores no llegan al Aprobador
    await api.accion(a, pub, mia, 'enviar');
    await api.accion(a, pubOtraUnidad, ajena, 'enviar');
    expect(await ids(apr)).toEqual([mia, ajena].sort());
    expect((await api.obtener(a, apr, mia)).status).toBe(200);
    expect(
      (await request(a).get('/api/v1/panel/publicaciones?estado=BORRADOR').set(auth(apr))).status,
    ).toBe(403);
  });

  it('descarta un borrador nunca enviado y rechaza descartar uno devuelto', async () => {
    const id = (await api.crear(a, pub)).body.id;
    const del = (i: string) => request(a).delete(`/api/v1/panel/publicaciones/${i}`).set(auth(pub));
    expect((await del(id)).status).toBe(204);
    expect(await prisma.publicacion.count()).toBe(0);

    const id2 = (await api.crear(a, pub)).body.id;
    await api.accion(a, pub, id2, 'enviar');
    await api.accion(a, apr, id2, 'devolver', { observaciones: 'Corregir lugar' });
    expect((await del(id2)).status).toBe(409);
  });

  it('exige sesión y rol Publicador para elaborar', async () => {
    expect((await request(a).post('/api/v1/panel/publicaciones').send(FICHA)).status).toBe(401);
    expect((await api.crear(a, apr)).status).toBe(403);
  });
});
