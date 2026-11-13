import type { Estado } from '@colpa/shared';

// Respuesta de GET /admin/auditoria (apps/api/src/services/auditoria.service.ts).
export interface RegistroDto {
  id: string;
  accion: string;
  entidadId: string;
  estadoResultante: Estado | null;
  detalle: string | null;
  fecha: string;
  funcionario: { id: string; nombreCompleto: string; identificadorCuenta: string };
  /** null si la publicación fue descartada. */
  publicacionTitulo: string | null;
}

export interface RespuestaAuditoria {
  registros: RegistroDto[];
  mensaje?: string;
}
