import request from 'supertest';
import { crearApp } from '../src/app';
import { prisma } from '../src/db';

afterAll(() => prisma.$disconnect());

describe('GET /api/v1/health', () => {
  it('responde 200 y confirma la base de datos real', async () => {
    const res = await request(crearApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });
});

describe('rutas desconocidas', () => {
  it('responde 404 en JSON con la forma del manejador de errores', async () => {
    const res = await request(crearApp()).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ error: 'No encontrado' });
  });
});
