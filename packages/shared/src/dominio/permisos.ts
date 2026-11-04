import { ROLES, TRANSICIONES, type Accion, type Rol } from './estados';

// Tabla 2.1 (capacidades por rol). Las acciones de transición no se repiten: su rol sale de TRANSICIONES.
const CAPACIDADES = {
  INICIAR_SESION: ROLES,
  ELABORAR_PUBLICACION: ['PUBLICADOR'],
  GESTIONAR_CUENTAS: ['ADMIN_TECNICO'],
  CONSULTAR_AUDITORIA: ['ADMIN_TECNICO'],
} as const satisfies Record<string, readonly Rol[]>;

export type Capacidad = keyof typeof CAPACIDADES;
export type Permiso = Capacidad | Accion;

const esAccion = (p: Permiso): p is Accion => p in TRANSICIONES;

export const puede = (rol: Rol, permiso: Permiso): boolean =>
  esAccion(permiso)
    ? TRANSICIONES[permiso].rol === rol
    : (CAPACIDADES[permiso] as readonly Rol[]).includes(rol);
