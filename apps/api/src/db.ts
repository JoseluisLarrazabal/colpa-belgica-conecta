import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL no está definida');

// max 5: en serverless cada instancia abre su pool y Neon limita conexiones; onPoolError evita que un error de un cliente ocioso tumbe el proceso.
export const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString, connectionTimeoutMillis: 5000, max: 5 },
    { onPoolError: (err) => console.error('Error en el pool de Postgres', err) },
  ),
});
