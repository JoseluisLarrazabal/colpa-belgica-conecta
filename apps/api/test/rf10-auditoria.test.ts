import request from 'supertest';
import { prisma } from '../src/db';
import { api, app, auth, crearFuncionario, crearUnidad, limpiar, token } from './helpers';

const a = app();
let admin: string;
let pub: string;

beforeEach(async () => {
  await limpiar();
  const unidadId = (await crearUnidad()).id;
  await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin');
  await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
  admin = await token(a, 'admin');
  pub = await token(a, 'pub');
});
afterAll(() => prisma.$disconnect());

const consultar = () => request(a).get('/api/v1/admin/auditoria').set(auth(admin));

describe('RF-10 Consultar auditoría', () => {
  it('cada registro trae el título de su publicación', async () => {
    const creada = await api.crear(a, pub);
    expect(creada.status).toBe(201);
    const res = await consultar();
    expect(res.status).toBe(200);
    expect(res.body.registros.length).toBeGreaterThan(0);
    for (const r of res.body.registros) {
      expect(r.entidadId).toBe(creada.body.id);
      expect(r.publicacionTitulo).toBe(creada.body.titulo);
    }
  });

  it('un registro cuya publicación fue descartada trae publicacionTitulo null', async () => {
    const creada = await api.crear(a, pub);
    const del = await request(a)
      .delete(`/api/v1/panel/publicaciones/${creada.body.id}`)
      .set(auth(pub));
    expect(del.status).toBe(204);
    const res = await consultar();
    const acciones = res.body.registros.map((r: { accion: string }) => r.accion);
    expect(acciones).toContain('DESCARTAR');
    for (const r of res.body.registros) expect(r.publicacionTitulo).toBeNull();
  });
});
