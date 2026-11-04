import request from 'supertest';
import { ROLES } from '@colpa/shared';
import { prisma } from '../src/db';
import { app, crearFuncionario, crearUnidad, limpiar, token } from './helpers';

const a = app();
let unidadId: string;
let admin: string;
let adminId: string;
const rol = (t: string, id: string, body: unknown) =>
  request(a)
    .put(`/api/v1/admin/funcionarios/${id}/rol`)
    .set({ Authorization: `Bearer ${t}` })
    .send(body as object);

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad()).id;
  adminId = (await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin')).id;
  admin = await token(a, 'admin');
});
afterAll(() => prisma.$disconnect());

describe('RF-03 Asignar rol a una cuenta', () => {
  it.each(ROLES)(
    'asigna el rol %s a una cuenta y se refleja en el siguiente token',
    async (nuevo) => {
      const f = await crearFuncionario(
        unidadId,
        nuevo === 'PUBLICADOR' ? 'APROBADOR' : 'PUBLICADOR',
        'otro',
      );
      const res = await rol(admin, f.id, { rol: nuevo });
      expect(res.status).toBe(200);
      expect(res.body.rol).toBe(nuevo);
      expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
      expect((await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } })).rol).toBe(nuevo);
      const t = await token(a, 'otro');
      const lista = await request(a)
        .get('/api/v1/admin/funcionarios')
        .set({ Authorization: `Bearer ${t}` });
      expect(lista.status).toBe(nuevo === 'ADMIN_TECNICO' ? 200 : 403); // el rol se lee de la BD en cada solicitud
    },
  );

  it('responde 400 con un rol no válido y 404 con una cuenta inexistente', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'otro');
    expect((await rol(admin, f.id, { rol: 'SUPERUSUARIO' })).status).toBe(400);
    expect((await rol(admin, f.id, {})).status).toBe(400);
    expect(
      (await rol(admin, '00000000-0000-4000-8000-000000000000', { rol: 'APROBADOR' })).status,
    ).toBe(404);
  });

  it('un no administrador recibe 403', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
    const t = await token(a, 'pub');
    expect((await rol(t, f.id, { rol: 'ADMIN_TECNICO' })).status).toBe(403);
    expect((await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } })).rol).toBe(
      'PUBLICADOR',
    );
  });

  it('no deja degradar al último Administrador técnico activo (409), pero sí si hay otro', async () => {
    expect((await rol(admin, adminId, { rol: 'PUBLICADOR' })).status).toBe(409);
    expect((await prisma.funcionario.findUniqueOrThrow({ where: { id: adminId } })).rol).toBe(
      'ADMIN_TECNICO',
    );

    const otro = await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin2');
    expect((await rol(admin, adminId, { rol: 'PUBLICADOR' })).status).toBe(200);
    // Ahora admin2 es el último: no puede degradarse.
    const t2 = await token(a, 'admin2');
    expect((await rol(t2, otro.id, { rol: 'APROBADOR' })).status).toBe(409);
  });

  it('un administrador inactivo no cuenta como respaldo', async () => {
    await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin2', { activo: false });
    expect((await rol(admin, adminId, { rol: 'APROBADOR' })).status).toBe(409);
  });
});
