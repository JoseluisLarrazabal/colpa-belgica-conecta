import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL no está definida');

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
});
