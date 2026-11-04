import request from 'supertest';
import { prisma } from '../src/db';
import {
  FICHA,
  api,
  app,
  auditoriaDe,
  auth,
  borradorDirecto,
  crearFuncionario,
  crearUnidad,
  limpiar,
  token,
} from './helpers';

const a = app();
let unidadId: string;
let pubFuncId: string;
let pub: string;
let apr: string;
let apr2: string;
let admin: string;
let otra: string;

/** Publicación creada por la API y llevada al estado indicado. */
async function enEstado(estado: 'BORRADOR' | 'EN_REVISION' | 'PUBLICADO' | 'ARCHIVADO') {
  const id = (await api.crear(a, pub)).body.id as string;
  if (estado !== 'BORRADOR') await api.accion(a, pub, id, 'enviar');
  if (estado === 'PUBLICADO' || estado === 'ARCHIVADO') await api.accion(a, apr, id, 'publicar');
  if (estado === 'ARCHIVADO') await api.accion(a, apr, id, 'archivar');
  return id;
}
const estadoBD = async (id: string) =>
  (await prisma.publicacion.findUniqueOrThrow({ where: { id } })).estado;

beforeEach(async () => {
  await limpiar();
  unidadId = (await crearUnidad('Salud')).id;
  const u2 = (await crearUnidad('Educacion')).id;
  pubFuncId = (await crearFuncionario(unidadId, 'PUBLICADOR', 'pub')).id;
  await crearFuncionario(unidadId, 'APROBADOR', 'apr');
  await crearFuncionario(u2, 'APROBADOR', 'apr2');
  await crearFuncionario(unidadId, 'ADMIN_TECNICO', 'admin');
  await crearFuncionario(u2, 'PUBLICADOR', 'pub2');
  pub = await token(a, 'pub');
  apr = await token(a, 'apr');
  apr2 = await token(a, 'apr2');
  admin = await token(a, 'admin');
  otra = await token(a, 'pub2');
});
afterAll(() => prisma.$disconnect());

describe('RF-06 Enviar publicación a revisión', () => {
  it('pasa a En revisión, audita y queda disponible para el Aprobador', async () => {
    const id = await enEstado('BORRADOR');
    const res = await api.accion(a, pub, id, 'enviar');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('EN_REVISION');
    const fila = (await auditoriaDe(id)).at(-1)!;
    expect(fila).toMatchObject({
      accion: 'ENVIAR_REVISION',
      funcionarioId: pubFuncId,
      estadoResultante: 'EN_REVISION',
    });
    const cola = await request(a).get('/api/v1/panel/publicaciones').set(auth(apr));
    expect((cola.body as { id: string }[]).map((p) => p.id)).toContain(id);
  });

  it('con la ficha incompleta permanece en Borrador, indica los datos faltantes y no audita', async () => {
    const b = await borradorDirecto(unidadId, pubFuncId, { lugar: 'Plaza' });
    const res = await api.accion(a, pub, b.id, 'enviar');
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.campos)).toEqual(
      expect.arrayContaining(['detalle', 'fechaInicio', 'hora', 'poblacionObjetivo', 'tipoVacuna']),
    );
    expect(await estadoBD(b.id)).toBe('BORRADOR');
    expect(await auditoriaDe(b.id)).toHaveLength(0);
  });

  it('rechaza reenviar (409), a otro rol (403) y la publicación de otra unidad (404)', async () => {
    const id = await enEstado('EN_REVISION');
    expect((await api.accion(a, pub, id, 'enviar')).status).toBe(409);
    const b = await enEstado('BORRADOR');
    expect((await api.accion(a, apr, b, 'enviar')).status).toBe(403);
    expect((await api.accion(a, otra, b, 'enviar')).status).toBe(404);
    expect(await estadoBD(b)).toBe('BORRADOR');
  });
});

describe('RF-07 Publicar publicación revisada', () => {
  it('pasa a Publicado con fecha y aprobador, y audita', async () => {
    const id = await enEstado('EN_REVISION');
    const res = await api.accion(a, apr, id, 'publicar');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('PUBLICADO');
    const bd = await prisma.publicacion.findUniqueOrThrow({ where: { id } });
    expect(bd.publicadoEn).not.toBeNull();
    expect(bd.aprobadorId).toBe(
      (await prisma.funcionario.findFirstOrThrow({ where: { identificadorCuenta: 'apr' } })).id,
    );
    expect((await auditoriaDe(id)).at(-1)).toMatchObject({
      accion: 'PUBLICAR',
      funcionarioId: bd.aprobadorId,
      estadoResultante: 'PUBLICADO',
    });
  });

  it('no cambia el estado desde Borrador (409) ni lo permite al Publicador o al Administrador (403)', async () => {
    const b = await enEstado('BORRADOR');
    expect((await api.accion(a, apr, b, 'publicar')).status).toBe(404); // el Aprobador no ve borradores
    const r = await enEstado('EN_REVISION');
    expect((await api.accion(a, pub, r, 'publicar')).status).toBe(403);
    expect((await api.accion(a, admin, r, 'publicar')).status).toBe(403);
    expect(await estadoBD(r)).toBe('EN_REVISION');
    const p = await enEstado('PUBLICADO');
    expect((await api.accion(a, apr, p, 'publicar')).status).toBe(409);
  });

  it('con dos Aprobadores simultáneos exactamente uno publica y el otro recibe 409', async () => {
    const id = await enEstado('EN_REVISION');
    const res = await Promise.all([
      api.accion(a, apr, id, 'publicar'),
      api.accion(a, apr2, id, 'publicar'),
    ]);
    expect(res.map((r) => r.status).sort()).toEqual([200, 409]);
    const filas = (await auditoriaDe(id)).filter((f) => f.accion === 'PUBLICAR');
    expect(filas).toHaveLength(1);
    expect(filas[0]!.funcionarioId).toBe(
      (await prisma.publicacion.findUniqueOrThrow({ where: { id } })).aprobadorId,
    );
  });
});

describe('RF-08 Devolver publicación con observaciones', () => {
  it('vuelve a Borrador, el Publicador ve las observaciones y audita', async () => {
    const id = await enEstado('EN_REVISION');
    const res = await api.accion(a, apr, id, 'devolver', { observaciones: '  Falta el horario  ' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('BORRADOR');
    expect((await api.obtener(a, pub, id)).body.observaciones).toBe('Falta el horario');
    expect((await auditoriaDe(id)).at(-1)).toMatchObject({
      accion: 'DEVOLVER',
      estadoResultante: 'BORRADOR',
    });
    expect((await api.accion(a, pub, id, 'enviar')).status).toBe(200); // ciclo de corrección
  });

  it.each([{}, { observaciones: '' }, { observaciones: '   ' }])(
    'sin observaciones (%j) no se devuelve, no cambia el estado y no audita',
    async (body) => {
      const id = await enEstado('EN_REVISION');
      const antes = (await auditoriaDe(id)).length;
      expect((await api.accion(a, apr, id, 'devolver', body)).status).toBe(400);
      expect(await estadoBD(id)).toBe('EN_REVISION');
      expect(await auditoriaDe(id)).toHaveLength(antes);
    },
  );

  it('solo el Aprobador y solo desde En revisión', async () => {
    const id = await enEstado('EN_REVISION');
    expect((await api.accion(a, pub, id, 'devolver', { observaciones: 'x' })).status).toBe(403);
    const p = await enEstado('PUBLICADO');
    expect((await api.accion(a, apr, p, 'devolver', { observaciones: 'x' })).status).toBe(409);
  });
});

describe('RF-09 Archivar publicación', () => {
  it('pasa a Archivado, conserva la fila (borrado lógico) y audita', async () => {
    const id = await enEstado('PUBLICADO');
    const res = await api.accion(a, apr, id, 'archivar');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ARCHIVADO');
    expect(
      (await prisma.publicacion.findUniqueOrThrow({ where: { id } })).archivadoEn,
    ).not.toBeNull();
    expect((await auditoriaDe(id)).at(-1)).toMatchObject({
      accion: 'ARCHIVAR',
      estadoResultante: 'ARCHIVADO',
    });
    const pub200 = await request(a).get('/api/v1/panel/publicaciones').set(auth(apr));
    expect((pub200.body as { id: string }[]).map((p) => p.id)).not.toContain(id); // la cola no la lista
  });

  it('mantiene el estado si no está Publicada (409) o si el rol no es Aprobador (403)', async () => {
    const r = await enEstado('EN_REVISION');
    expect((await api.accion(a, apr, r, 'archivar')).status).toBe(409);
    const p = await enEstado('PUBLICADO');
    expect((await api.accion(a, pub, p, 'archivar')).status).toBe(403);
    expect(await estadoBD(p)).toBe('PUBLICADO');
    const z = await enEstado('ARCHIVADO');
    expect((await api.accion(a, apr, z, 'archivar')).status).toBe(409);
  });
});

describe('RF-10 Consultar el registro de auditoría', () => {
  const consulta = (t: string, q = '') =>
    request(a).get(`/api/v1/admin/auditoria${q}`).set(auth(t));

  it('lista cronológicamente funcionario, acción, fecha y estado del recorrido completo', async () => {
    const id = await enEstado('ARCHIVADO'); // crear, enviar, publicar, archivar
    const res = await consulta(admin, `?publicacionId=${id}`);
    expect(res.status).toBe(200);
    const filas = res.body.registros as {
      accion: string;
      estadoResultante: string;
      fecha: string;
      funcionario: { identificadorCuenta: string };
    }[];
    expect(
      filas.map((f) => [f.accion, f.estadoResultante, f.funcionario.identificadorCuenta]),
    ).toEqual([
      ['CREAR', 'BORRADOR', 'pub'],
      ['ENVIAR_REVISION', 'EN_REVISION', 'pub'],
      ['PUBLICAR', 'PUBLICADO', 'apr'],
      ['ARCHIVAR', 'ARCHIVADO', 'apr'],
    ]);
    const fechas = filas.map((f) => Date.parse(f.fecha));
    expect(fechas).toEqual([...fechas].sort((x, y) => x - y));
  });

  it('filtra por acción y funcionario; sin coincidencias informa que no hay registros', async () => {
    const id = await enEstado('PUBLICADO');
    const por = await consulta(admin, `?publicacionId=${id}&accion=PUBLICAR`);
    expect(por.body.registros).toHaveLength(1);
    const fid = (
      await prisma.funcionario.findFirstOrThrow({ where: { identificadorCuenta: 'apr' } })
    ).id;
    expect((await consulta(admin, `?funcionarioId=${fid}`)).body.registros).toHaveLength(1);

    const vacio = await consulta(admin, '?publicacionId=00000000-0000-4000-8000-000000000000');
    expect(vacio.status).toBe(200);
    expect(vacio.body).toEqual({
      registros: [],
      mensaje: 'No existen registros para el criterio indicado',
    });
    expect((await consulta(admin, '?publicacionId=no-es-uuid')).status).toBe(400);
  });

  it('solo el Administrador técnico consulta', async () => {
    expect((await consulta(pub)).status).toBe(403);
    expect((await consulta(apr)).status).toBe(403);
    expect((await request(a).get('/api/v1/admin/auditoria')).status).toBe(401);
  });

  it('no se puede modificar: sin rutas de escritura y la BD rechaza UPDATE y DELETE', async () => {
    const id = await enEstado('BORRADOR');
    for (const m of ['post', 'put', 'patch', 'delete'] as const) {
      expect((await request(a)[m]('/api/v1/admin/auditoria').set(auth(admin))).status).toBe(404);
    }
    await expect(
      prisma.registroAuditoria.updateMany({ where: { entidadId: id }, data: { accion: 'X' } }),
    ).rejects.toThrow();
    await expect(
      prisma.registroAuditoria.deleteMany({ where: { entidadId: id } }),
    ).rejects.toThrow();
    expect(await auditoriaDe(id)).toHaveLength(1);
  });
});

describe('RF-11 Registrar campaña de vacunación', () => {
  it('guarda la campaña en Borrador del módulo de salud con población objetivo y tipo de vacuna', async () => {
    const res = await api.crear(a, pub);
    expect(res.status).toBe(201);
    const bd = await prisma.publicacion.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(bd).toMatchObject({
      modulo: 'SALUD',
      tipo: 'CAMPANA_VACUNACION',
      estado: 'BORRADOR',
      poblacionObjetivo: FICHA.poblacionObjetivo,
      tipoVacuna: FICHA.tipoVacuna,
      lugar: FICHA.lugar,
    });
  });

  it.each(['tipoVacuna', 'poblacionObjetivo', 'lugar', 'fechaInicio'] as const)(
    'indica el campo obligatorio sin completar (%s) y no guarda',
    async (campo) => {
      const res = await api.crear(a, pub, { ...FICHA, [campo]: undefined });
      expect(res.status).toBe(400);
      expect(Object.keys(res.body.campos)).toContain(campo);
      expect(await prisma.publicacion.count()).toBe(0);
    },
  );

  it('una campaña no puede pertenecer a otro módulo', async () => {
    expect((await api.crear(a, pub, { ...FICHA, modulo: 'EVENTOS' })).status).toBe(400);
  });
});
