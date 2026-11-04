import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/db';

afterAll(() => prisma.$disconnect());

describe('integridad de la base', () => {
  it('rechaza una publicación cuyo tipo no pertenece a su módulo', async () => {
    await expect(
      prisma.publicacion.create({
        data: {
          modulo: 'SALUD',
          tipo: 'FERIA',
          titulo: 'inválida',
          unidadId: randomUUID(),
          autorId: randomUUID(),
        },
      }),
    ).rejects.toThrow(/publicacion_tipo_modulo_chk/);
  });
});

describe('manejo de errores', () => {
  it('responde 400 (no 500) ante JSON inválido', async () => {
    const res = await request(crearApp())
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{malo');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Solicitud inválida' });
  });
});
