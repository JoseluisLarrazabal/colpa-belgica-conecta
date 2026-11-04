import { z } from 'zod';
import {
  CATALOGO,
  MODULOS,
  TIPOS_DESTACABLES,
  tipoPerteneceAModulo,
  type TipoPublicacion,
} from '../catalogo';
import { ACCIONES, estadoSchema } from '../dominio/estados';

// Longitudes = columnas de publicacion (Tabla 2.55).
const texto = (max: number) => z.string().trim().min(1).max(max);
const fecha = z.iso.date();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora HH:MM');

/** Campos obligatorios de toda ficha (RF-04, CU-03). */
const base = {
  modulo: z.enum(MODULOS),
  titulo: texto(150),
  detalle: z.string().trim().min(1),
  fechaInicio: fecha,
  fechaFin: fecha.nullish(),
  hora,
  lugar: texto(150),
  poblacionObjetivo: texto(150),
  requisitos: z.string().trim().min(1),
  destacado: z.boolean().optional(), // RF-14; sin default: bajo .partial() Zod 4 lo aplicaría y la edición desmarcaría la ficha
};

/** Campos propios de un tipo (se suman a `base`). Agregar un tipo = una entrada aquí. */
const EXTRAS: Partial<Record<TipoPublicacion, z.ZodRawShape>> = {
  CAMPANA_VACUNACION: { tipoVacuna: texto(100) }, // RF-11
};

const variante = (tipo: TipoPublicacion) =>
  z.object({ ...base, ...EXTRAS[tipo], tipo: z.literal(tipo) });

const TIPOS = Object.values(CATALOGO).flat();

/** Ficha completa por tipo (unión discriminada por `tipo`); el tipo debe corresponder al módulo. */
export const fichaSchema = z
  .discriminatedUnion('tipo', TIPOS.map(variante) as [ReturnType<typeof variante>])
  .superRefine((f, ctx) => {
    if (!tipoPerteneceAModulo(f.modulo, f.tipo)) {
      ctx.addIssue({ code: 'custom', path: ['tipo'], message: 'El tipo no corresponde al módulo' });
    }
    if (f.destacado && !TIPOS_DESTACABLES.includes(f.tipo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['destacado'],
        message: 'Solo se puede destacar un comunicado sanitario',
      });
    }
    if (f.fechaFin && f.fechaFin < f.fechaInicio) {
      ctx.addIssue({
        code: 'custom',
        path: ['fechaFin'],
        message: 'No puede ser anterior al inicio',
      });
    }
  });
export type FichaInput = z.infer<typeof fichaSchema>;

/** Campos extra de cada tipo (para rechazar en la edición los de otro tipo). */
export const camposExtra = (tipo: string | null) =>
  Object.keys((tipo && EXTRAS[tipo as TipoPublicacion]) || {});
const extrasTodos: z.ZodRawShape = Object.assign({}, ...Object.values(EXTRAS));
export const CAMPOS_EXTRA = Object.keys(extrasTodos);
const baseEditable: Partial<typeof base> = { ...base };
delete baseEditable.modulo;

/** Edición parcial: no cambia módulo ni tipo; el resultado combinado se revalida con `fichaSchema`. */
export const editarFichaSchema = z
  .object({ ...baseEditable, ...extrasTodos })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Indica al menos un campo a modificar' });
export type EditarFichaInput = z.infer<typeof editarFichaSchema>;

const paginacion = {
  limite: z.coerce.number().int().min(1).max(100).default(50),
  desplazamiento: z.coerce.number().int().min(0).default(0),
};

export const listarPublicacionesSchema = z.object({
  estado: estadoSchema.optional(),
  modulo: z.enum(MODULOS).optional(),
  ...paginacion,
});
export type ListarPublicacionesInput = z.infer<typeof listarPublicacionesSchema>;

/** RF-15: filtros de la lista pública (Tabla 2.64); el tipo, si se da, debe pertenecer al módulo. */
export const listarPublicasSchema = z
  .object({
    modulo: z.enum(MODULOS).optional(),
    tipo: z.enum(TIPOS as [TipoPublicacion]).optional(),
    ...paginacion,
  })
  .refine((q) => !q.modulo || !q.tipo || tipoPerteneceAModulo(q.modulo, q.tipo), {
    path: ['tipo'],
    message: 'El tipo no corresponde al módulo',
  });
export type ListarPublicasInput = z.infer<typeof listarPublicasSchema>;

export const devolverSchema = z.object({ observaciones: z.string().trim().max(2000).optional() });
export type DevolverInput = z.infer<typeof devolverSchema>;

/** RF-05: máximo de imágenes por publicación (el documento no lo fija) y formatos admitidos. */
export const MAX_IMAGENES = 4;
export const FORMATOS_IMAGEN = ['jpg', 'jpeg', 'png', 'webp'] as const;

export const registrarImagenSchema = z.object({
  publicId: z.string().min(1).max(255),
  formato: z.enum(FORMATOS_IMAGEN),
});
export type RegistrarImagenInput = z.infer<typeof registrarImagenSchema>;

export const imagenParamSchema = z.object({ id: z.uuid(), imagenId: z.uuid() });

/** Acciones de auditoría: las de transición más las de alta, edición y descarte del borrador. */
export const ACCIONES_AUDITORIA = [...ACCIONES, 'CREAR', 'EDITAR', 'DESCARTAR'] as const;

/** RF-10: filtros de la consulta de auditoría (Tabla 2.64). */
export const consultarAuditoriaSchema = z.object({
  publicacionId: z.uuid().optional(),
  funcionarioId: z.uuid().optional(),
  accion: z.enum(ACCIONES_AUDITORIA).optional(),
  estado: estadoSchema.optional(),
  desde: z.iso.datetime({ offset: true }).optional(),
  hasta: z.iso.datetime({ offset: true }).optional(),
  ...paginacion,
});
export type ConsultarAuditoriaInput = z.infer<typeof consultarAuditoriaSchema>;
