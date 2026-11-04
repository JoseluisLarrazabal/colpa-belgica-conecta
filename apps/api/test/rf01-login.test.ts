import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ROLES } from '@colpa/shared';
import { crearApp } from '../src/app';
import { prisma } from '../src/db';
import { MAX_INTENTOS } from '../src/config';
import { CLAVE, app, crearFuncionario, crearUnidad, limpiar, login, token } from './helpers';

const a = app();
let unidadId: string;

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad()).id;
});
afterAll(() => prisma.$disconnect());

describe('RF-01 Iniciar sesión', () => {
  it.each(ROLES)('inicia sesión con rol %s y devuelve token sin el hash', async (rol) => {
    const f = await crearFuncionario(unidadId, rol, `u.${rol}`);
    const res = await login(a, f.identificadorCuenta);
    expect(res.status).toBe(200);
    expect(res.body.funcionario).toMatchObject({ id: f.id, rol });
    expect(res.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/hash/i);
    const p = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(p).toMatchObject({ sub: f.id });
    expect(p.jti).toBeTruthy();
    expect(p.exp! - p.iat!).toBeLessThanOrEqual(3600);
    expect(
      await prisma.registroAuditoria.count({
        where: { accion: 'INICIAR_SESION', funcionarioId: f.id },
      }),
    ).toBe(1);
  });

  it('rechaza contraseña incorrecta y cuenta inexistente con el mismo mensaje', async () => {
    await crearFuncionario(unidadId, 'PUBLICADOR', 'existe');
    const mala = await login(a, 'existe', 'otra-clave-incorrecta');
    const nadie = await login(a, 'no.existe');
    expect(mala.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(mala.body).toEqual(nadie.body);
  });

  it('responde 400 con errores por campo si faltan datos', async () => {
    const res = await request(a).post('/api/v1/auth/login').send({ identificadorCuenta: '' });
    expect(res.status).toBe(400);
    expect(res.body.campos).toHaveProperty('contrasena');
  });

  it('bloquea tras N intentos fallidos, rechaza la clave correcta mientras dura y la acepta al vencer', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'bloq');
    for (let i = 0; i < MAX_INTENTOS; i++)
      expect((await login(a, 'bloq', 'mala-clave-xx')).status).toBe(401);
    const bloqueada = await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } });
    expect(bloqueada.bloqueadoHasta!.getTime()).toBeGreaterThan(Date.now());

    const conClave = await login(a, 'bloq');
    expect(conClave.status).toBe(401);
    expect(conClave.body.error).toBe((await login(a, 'no.existe')).body.error);

    await prisma.funcionario.update({
      where: { id: f.id },
      data: { bloqueadoHasta: new Date(Date.now() - 1000) },
    });
    expect((await login(a, 'bloq')).status).toBe(200);
    expect(
      (await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } })).intentosFallidos,
    ).toBe(0);
  });

  it('bloquea ante intentos fallidos en paralelo y rechaza la clave correcta mientras dura', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'carrera');
    const res = await Promise.all(
      Array.from({ length: 12 }, () => login(a, 'carrera', 'mala-clave-xx')),
    );
    expect(res.every((r) => r.status === 401)).toBe(true);
    const fila = await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } });
    expect(fila.bloqueadoHasta!.getTime()).toBeGreaterThan(Date.now());
    expect(fila.intentosFallidos).toBeLessThan(MAX_INTENTOS);
    expect((await login(a, 'carrera')).status).toBe(401);
  });

  it('un acceso correcto reinicia el contador de intentos', async () => {
    const f = await crearFuncionario(unidadId, 'PUBLICADOR', 'cont');
    await login(a, 'cont', 'mala-clave-xx');
    await login(a, 'cont', 'mala-clave-xx');
    expect((await login(a, 'cont')).status).toBe(200);
    expect(
      (await prisma.funcionario.findUniqueOrThrow({ where: { id: f.id } })).intentosFallidos,
    ).toBe(0);
  });

  it('rechaza el inicio de sesión de una cuenta desactivada con el mismo mensaje', async () => {
    await crearFuncionario(unidadId, 'PUBLICADOR', 'inactiva', { activo: false });
    const res = await login(a, 'inactiva');
    expect(res.status).toBe(401);
    expect(res.body).toEqual((await login(a, 'no.existe')).body);
  });

  it('limita las solicitudes de login por IP (429)', async () => {
    const limitada = crearApp({ loginMax: 2 });
    const codigos = [];
    for (let i = 0; i < 3; i++) codigos.push((await login(limitada, 'no.existe')).status);
    expect(codigos).toEqual([401, 401, 429]);
  });

  describe('sesión en rutas protegidas', () => {
    const protegida = (t?: string) => {
      const r = request(a).get('/api/v1/admin/funcionarios');
      return t ? r.set('Authorization', `Bearer ${t}`) : r;
    };

    it('rechaza sin token y con token basura', async () => {
      expect((await protegida()).status).toBe(401);
      expect((await protegida('basura')).status).toBe(401);
    });

    it('rechaza un token vencido (401)', async () => {
      const f = await crearFuncionario(unidadId, 'ADMIN_TECNICO');
      const vencido = jwt.sign({ rol: f.rol }, process.env['JWT_SECRET']!, {
        subject: f.id,
        jwtid: 'jti-vencido',
        expiresIn: -10,
      });
      expect((await protegida(vencido)).status).toBe(401);
    });

    it('rechaza un token firmado con otro secreto o sin firma', async () => {
      const f = await crearFuncionario(unidadId, 'ADMIN_TECNICO');
      const ajeno = jwt.sign({}, 'otro-secreto-de-32-caracteres-xxxxxxxx', {
        subject: f.id,
        jwtid: 'x',
        expiresIn: 60,
      });
      const sinFirma = jwt.sign({}, '', {
        algorithm: 'none',
        subject: f.id,
        jwtid: 'y',
        expiresIn: 60,
      });
      expect((await protegida(ajeno)).status).toBe(401);
      expect((await protegida(sinFirma)).status).toBe(401);
    });

    it('revoca el token al cerrar sesión (jti en sesion_revocada)', async () => {
      const f = await crearFuncionario(unidadId, 'ADMIN_TECNICO');
      const t = await token(a, f.identificadorCuenta);
      expect((await protegida(t)).status).toBe(200);
      expect(
        (await request(a).post('/api/v1/auth/logout').set('Authorization', `Bearer ${t}`)).status,
      ).toBe(204);
      expect(
        await prisma.sesionRevocada.count({
          where: { jti: (jwt.decode(t) as jwt.JwtPayload).jti },
        }),
      ).toBe(1);
      expect((await protegida(t)).status).toBe(401);
    });

    it('logout sin token responde 401', async () => {
      expect((await request(a).post('/api/v1/auth/logout')).status).toBe(401);
    });

    it('invalida de inmediato el token de una cuenta desactivada', async () => {
      const f = await crearFuncionario(unidadId, 'ADMIN_TECNICO');
      const t = await token(a, f.identificadorCuenta);
      await prisma.funcionario.update({ where: { id: f.id }, data: { activo: false } });
      expect((await protegida(t)).status).toBe(401);
    });
  });

  it('exige contraseña correcta (verificación argon2 real)', async () => {
    await crearFuncionario(unidadId, 'PUBLICADOR', 'argon');
    expect((await login(a, 'argon', CLAVE + 'x')).status).toBe(401);
  });
});
