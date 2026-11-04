import type { ConsultarAuditoriaInput, Estado } from '@colpa/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';

/** Inserta una fila de auditoría dentro de la transacción del cambio que registra. */
export const registrar = (
  tx: Prisma.TransactionClient,
  r: {
    funcionarioId: string;
    accion: string;
    entidadId: string;
    estadoResultante: Estado | null;
    detalle?: string;
  },
) => tx.registroAuditoria.create({ data: { entidad: 'publicacion', ...r } });

/** RF-10: lista cronológica (la más antigua primero); sin registros devuelve la lista vacía y un mensaje. */
export async function consultar(f: ConsultarAuditoriaInput) {
  const where: Prisma.RegistroAuditoriaWhereInput = {
    entidad: 'publicacion', // RF-10 cubre las acciones sobre publicaciones (no los inicios de sesión)
    ...(f.publicacionId && { entidadId: f.publicacionId }),
    ...(f.funcionarioId && { funcionarioId: f.funcionarioId }),
    ...(f.accion && { accion: f.accion }),
    ...(f.estado && { estadoResultante: f.estado }),
    ...((f.desde || f.hasta) && {
      fecha: {
        ...(f.desde && { gte: new Date(f.desde) }),
        ...(f.hasta && { lte: new Date(f.hasta) }),
      },
    }),
  };
  const registros = await prisma.registroAuditoria.findMany({
    where,
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
    take: f.limite,
    skip: f.desplazamiento,
    include: {
      funcionario: { select: { id: true, nombreCompleto: true, identificadorCuenta: true } },
    },
  });
  return registros.length
    ? { registros }
    : { registros, mensaje: 'No existen registros para el criterio indicado' };
}
