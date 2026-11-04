import { z } from 'zod';

// Valores de la Tabla 2.52 (estado_publicacion, rol_funcionario) y Tabla 2.2.
export const ESTADOS = ['BORRADOR', 'EN_REVISION', 'PUBLICADO', 'ARCHIVADO'] as const;
export const ROLES = ['PUBLICADOR', 'APROBADOR', 'ADMIN_TECNICO'] as const;
export const ACCIONES = ['ENVIAR_REVISION', 'PUBLICAR', 'DEVOLVER', 'ARCHIVAR'] as const;

export const estadoSchema = z.enum(ESTADOS);
export const rolSchema = z.enum(ROLES);
export const accionSchema = z.enum(ACCIONES);

export type Estado = z.infer<typeof estadoSchema>;
export type Rol = z.infer<typeof rolSchema>;
export type Accion = z.infer<typeof accionSchema>;

// Tabla 2.2. "Crear publicación" (sin estado -> BORRADOR) no es transición: es alta.
export const TRANSICIONES: Record<Accion, { desde: Estado; hacia: Estado; rol: Rol }> = {
  ENVIAR_REVISION: { desde: 'BORRADOR', hacia: 'EN_REVISION', rol: 'PUBLICADOR' },
  PUBLICAR: { desde: 'EN_REVISION', hacia: 'PUBLICADO', rol: 'APROBADOR' },
  DEVOLVER: { desde: 'EN_REVISION', hacia: 'BORRADOR', rol: 'APROBADOR' },
  ARCHIVAR: { desde: 'PUBLICADO', hacia: 'ARCHIVADO', rol: 'APROBADOR' },
};

/** Devuelve el estado resultante, o null si estado o rol no permiten la acción. */
export function puedeTransicionar(estado: Estado, accion: Accion, rol: Rol): Estado | null {
  const t = TRANSICIONES[accion];
  return t.desde === estado && t.rol === rol ? t.hacia : null;
}
