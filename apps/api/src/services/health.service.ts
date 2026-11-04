import { prisma } from '../db';

export async function comprobarBaseDeDatos(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
