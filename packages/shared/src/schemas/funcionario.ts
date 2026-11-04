import { z } from 'zod';
import { rolSchema } from '../dominio/estados';

// Longitudes = columnas de funcionario (Tabla 2.54). El tope de contraseña evita DoS por hash de entradas enormes.
const identificador = z.string().trim().min(1).max(60);
const nombre = z.string().trim().min(1).max(120);
export const CONTRASENA_MIN = 10;
export const CONTRASENA_MAX = 128;

export const loginSchema = z.object({
  identificadorCuenta: identificador,
  contrasena: z.string().min(1).max(CONTRASENA_MAX),
});

export const crearCuentaSchema = z.object({
  nombreCompleto: nombre,
  identificadorCuenta: identificador,
  unidadId: z.uuid(),
  rol: rolSchema,
  contrasena: z.string().min(CONTRASENA_MIN).max(CONTRASENA_MAX),
});

export const editarCuentaSchema = z
  .object({
    nombreCompleto: nombre,
    unidadId: z.uuid(),
    activo: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo a modificar' });

export const asignarRolSchema = z.object({ rol: rolSchema });

export const idParamSchema = z.object({ id: z.uuid() });

export type LoginInput = z.infer<typeof loginSchema>;
export type CrearCuentaInput = z.infer<typeof crearCuentaSchema>;
export type EditarCuentaInput = z.infer<typeof editarCuentaSchema>;
