import type { Rol } from '@colpa/shared';

// Respuesta de la API (`PUBLICO` en apps/api/src/services/cuentas.service.ts); @colpa/shared solo define la entrada.
export interface CuentaDto {
  id: string;
  nombreCompleto: string;
  identificadorCuenta: string;
  rol: Rol;
  unidadId: string;
  activo: boolean;
  creadoEn: string;
}

export interface UnidadDto {
  id: string;
  nombre: string;
}
