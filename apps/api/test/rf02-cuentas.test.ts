import request from 'supertest';
import { prisma } from '../src/db';
import { app, crearFuncionario, crearUnidad, limpiar, login, token } from './helpers';

const a = app();
let unidadId: string;
let admin: string;
const URL = '/api/v1/admin/funcionarios';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const nueva = (o = {}) => ({
  nombreCompleto: 'Ana Pérez',
  identificadorCuenta: 'ana.perez',
  unidadId,
  rol: 'PUBLICADOR',
  contrasena: 'contrasena-inicial-1',
  ...o,
});

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad()).id;
  await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin');
  admin = await token(a, 'admin');
});
afterAll(() => prisma.$disconnect());

describe('RF-02 Gestionar cuentas de funcionarios', () => {
  it('lista unidades y cuentas sin exponer el hash', async () => {
    const u = await request(a).get('/api/v1/admin/unidades').set(auth(admin));
    expect(u.status).toBe(200);
    expect(u.body[0]).toMatchObject({ id: unidadId, nombre: 'Salud' });
    const l = await request(a).get(URL).set(auth(admin));
    expect(l.status).toBe(200);
    expect(l.body).toHaveLength(1);
    expect(JSON.stringify(l.body)).not.toMatch(/hash/i);
  });

  it('crea una cuenta con unidad, guarda hash argon2 con sal y permite iniciar sesión', async () => {
    const res = await request(a).post(URL).set(auth(admin)).send(nueva());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      identificadorCuenta: 'ana.perez',
      rol: 'PUBLICADOR',
      unidadId,
      activo: true,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|contrasena/i);
    const fila = await prisma.funcionario.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(fila.hashContrasena).toMatch(/^\$argon2id\$/);
    expect(fila.hashContrasena).not.toContain('contrasena-inicial-1');
    expect((await login(a, 'ana.perez', 'contrasena-inicial-1')).status).toBe(200);
  });

  it('responde 409 si el identificador de cuenta está duplicado', async () => {
    await request(a).post(URL).set(auth(admin)).send(nueva());
    const res = await request(a).post(URL).set(auth(admin)).send(nueva());
    expect(res.status).toBe(409);
  });

  it('responde 400 con datos incompletos, rol inválido, contraseña corta o unidad inexistente', async () => {
    const sin = await request(a).post(URL).set(auth(admin)).send({ nombreCompleto: 'X' });
    expect(sin.status).toBe(400);
    expect(sin.body.campos).toHaveProperty('identificadorCuenta');
    expect(
      (
        await request(a)
          .post(URL)
          .set(auth(admin))
          .send(nueva({ rol: 'JEFE' }))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(a)
          .post(URL)
          .set(auth(admin))
          .send(nueva({ contrasena: 'corta' }))
      ).status,
    ).toBe(400);
    const uni = await request(a)
      .post(URL)
      .set(auth(admin))
      .send(nueva({ unidadId: '00000000-0000-4000-8000-000000000000' }));
    expect(uni.status).toBe(400);
  });

  it('modifica nombre y unidad, y desactiva la cuenta (borrado lógico)', async () => {
    const otra = await crearUnidad('Educación');
    const c = (await request(a).post(URL).set(auth(admin)).send(nueva())).body;
    const ed = await request(a)
      .patch(`${URL}/${c.id}`)
      .set(auth(admin))
      .send({ nombreCompleto: 'Ana P.', unidadId: otra.id });
    expect(ed.status).toBe(200);
    expect(ed.body).toMatchObject({ nombreCompleto: 'Ana P.', unidadId: otra.id });
    const des = await request(a).patch(`${URL}/${c.id}`).set(auth(admin)).send({ activo: false });
    expect(des.body.activo).toBe(false);
    expect(await prisma.funcionario.count({ where: { id: c.id } })).toBe(1);
    expect((await login(a, 'ana.perez', 'contrasena-inicial-1')).status).toBe(401);
  });

  it('reactivar una cuenta limpia su bloqueo', async () => {
    const c = (await request(a).post(URL).set(auth(admin)).send(nueva())).body;
    await prisma.funcionario.update({
      where: { id: c.id },
      data: { activo: false, bloqueadoHasta: new Date(Date.now() + 60000) },
    });
    await request(a).patch(`${URL}/${c.id}`).set(auth(admin)).send({ activo: true });
    expect((await login(a, 'ana.perez', 'contrasena-inicial-1')).status).toBe(200);
  });

  it('responde 400 al editar sin campos o con id inválido, y 404 si la cuenta no existe', async () => {
    const c = (await request(a).post(URL).set(auth(admin)).send(nueva())).body;
    expect((await request(a).patch(`${URL}/${c.id}`).set(auth(admin)).send({})).status).toBe(400);
    expect(
      (await request(a).patch(`${URL}/no-es-uuid`).set(auth(admin)).send({ activo: false })).status,
    ).toBe(400);
    expect(
      (
        await request(a)
          .patch(`${URL}/00000000-0000-4000-8000-000000000000`)
          .set(auth(admin))
          .send({ activo: false })
      ).status,
    ).toBe(404);
  });

  it('un administrador no puede desactivarse si es el último activo (409)', async () => {
    const yo = await prisma.funcionario.findUniqueOrThrow({
      where: { identificadorCuenta: 'admin' },
    });
    const res = await request(a).patch(`${URL}/${yo.id}`).set(auth(admin)).send({ activo: false });
    expect(res.status).toBe(409);
    expect((await prisma.funcionario.findUniqueOrThrow({ where: { id: yo.id } })).activo).toBe(
      true,
    );
  });

  it('rechaza con 403 a Publicador y Aprobador, y con 401 sin sesión (RNF-28, RNF-32)', async () => {
    await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
    await crearFuncionario(unidadId, 'APROBADOR', 'apr');
    for (const cuenta of ['pub', 'apr']) {
      const t = await token(a, cuenta);
      expect((await request(a).get(URL).set(auth(t))).status).toBe(403);
      expect((await request(a).post(URL).set(auth(t)).send(nueva())).status).toBe(403);
    }
    expect((await request(a).get(URL)).status).toBe(401);
    expect(await prisma.funcionario.count()).toBe(3);
  });

  it('PATCH vacío responde 400 con el mensaje del refine; cuerpo no objeto también', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
    const vacio = await request(a).patch(`${URL}/${f.id}`).set(auth(admin)).send({});
    expect(vacio.status).toBe(400);
    expect(vacio.body.errores).toContain('Indica al menos un campo a modificar');
    const sin = await request(a).patch(`${URL}/${f.id}`).set(auth(admin));
    expect(sin.status).toBe(400);
    expect(sin.body.error).toMatch(/objeto/);
  });

  it('desactivar y reactivar invalida los tokens anteriores; un login nuevo funciona', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
    const viejo = await token(a, 'pub');
    const lista = (t: string) => request(a).get(`${URL}`).set(auth(t));
    const patch = (activo: boolean) =>
      request(a).patch(`${URL}/${f.id}`).set(auth(admin)).send({ activo });
    expect((await patch(false)).status).toBe(200);
    expect((await patch(true)).status).toBe(200);
    expect((await lista(viejo)).status).toBe(401);
    const nuevo = await token(a, 'pub');
    expect(nuevo).toBeTruthy();
    expect((await request(a).post('/api/v1/auth/logout').set(auth(nuevo))).status).toBe(204);
  });

  it('cambiar el rol e iniciar sesión en el mismo segundo: el token nuevo sirve y el viejo da 401', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'pub');
    const viejo = await token(a, 'pub');
    const r = await request(a)
      .put(`${URL}/${f.id}/rol`)
      .set(auth(admin))
      .send({ rol: 'APROBADOR' });
    expect(r.status).toBe(200);
    const nuevo = await token(a, 'pub');
    expect((await request(a).post('/api/v1/auth/logout').set(auth(viejo))).status).toBe(401);
    expect((await request(a).post('/api/v1/auth/logout').set(auth(nuevo))).status).toBe(204);
  });
});
