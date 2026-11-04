// Módulos y tipos de publicación (Tabla 2.52; RF-11 a RF-14, RF-17, RF-18, RF-21).
export const CATALOGO = {
  SALUD: ['CAMPANA_VACUNACION', 'JORNADA_ATENCION', 'ENTREGA_MEDICAMENTOS', 'COMUNICADO_SANITARIO'],
  EDUCACION: ['ACTIVIDAD_ESCOLAR', 'COMUNICADO_EDUCACION'],
  EVENTOS: ['FERIA', 'REUNION_VECINAL', 'ACTIVIDAD_CULTURAL', 'ACTIVIDAD_DEPORTIVA'],
} as const;

/** Tipos que RF-14 permite destacar y RF-16 muestra en la pantalla principal (el catálogo no tiene tipo de emergencia). */
export const TIPOS_DESTACABLES: readonly TipoPublicacion[] = ['COMUNICADO_SANITARIO'];

export type Modulo = keyof typeof CATALOGO;
export type TipoPublicacion = (typeof CATALOGO)[Modulo][number];

export const MODULOS = Object.keys(CATALOGO) as Modulo[];

export function tipoPerteneceAModulo(modulo: Modulo, tipo: string): tipo is TipoPublicacion {
  return (CATALOGO[modulo] as readonly string[]).includes(tipo);
}
