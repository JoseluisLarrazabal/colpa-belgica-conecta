import {
  CATALOGO,
  fichaSchema,
  type EditarFichaInput,
  type FichaInput,
  type Modulo,
  type TipoPublicacion,
} from '@colpa/shared';
import type { PublicacionDto } from './tipos';

export const moduloDeTipo = (tipo: TipoPublicacion): Modulo =>
  (Object.keys(CATALOGO) as Modulo[]).find((m) =>
    (CATALOGO[m] as readonly string[]).includes(tipo),
  )!;

// fechaFin es opcional: vaciarla se envía como null (la API la borra); el resto de campos no admite null.
const EDITABLES = [
  'titulo',
  'detalle',
  'fechaInicio',
  'fechaFin',
  'hora',
  'lugar',
  'poblacionObjetivo',
  'requisitos',
] as const;

export const MSG_VACIO_EDICION = 'Este campo no puede quedar vacío al editar';

/**
 * Campos que tenían valor y el usuario dejó vacíos. Salvo fechaFin (opcional, se envía null), editarFichaSchema
 * solo acepta strings no vacíos, así que no hay forma de borrarlos por PATCH: el formulario bloquea el guardado.
 */
export function vaciados(
  valores: Record<string, unknown>,
  actual: PublicacionDto,
  extras: readonly string[],
): string[] {
  const previo = actual as unknown as Record<string, string | null>;
  return [...EDITABLES, ...extras].filter(
    (k) => k !== 'fechaFin' && !String(valores[k] ?? '').trim() && (previo[k] ?? '') !== '',
  );
}

/**
 * Cambios para PATCH: solo campos no vacíos y distintos de lo guardado (los vacíos se
 * reportan con `vaciados`; fechaFin vaciada va como null) y `destacado` si cambió.
 */
export function parche(
  valores: Record<string, unknown>,
  actual: PublicacionDto,
  extras: readonly string[],
): EditarFichaInput {
  const previo = actual as unknown as Record<string, string | null>;
  const out: Record<string, string | boolean | null> = {};
  for (const k of [...EDITABLES, ...extras]) {
    const nuevo = String(valores[k] ?? '').trim();
    if (k === 'fechaFin' && !nuevo && previo[k]) out[k] = null;
    else if (nuevo && nuevo !== (previo[k] ?? '')) out[k] = nuevo;
  }
  if (typeof valores.destacado === 'boolean' && valores.destacado !== actual.destacado)
    out.destacado = valores.destacado;
  return out as EditarFichaInput;
}

/** Los 5 campos de la ficha que cuentan para "N de 5 completos" (FichaLista, en su orden). */
export const CAMPOS_PROGRESO = [
  'fechaInicio',
  'hora',
  'lugar',
  'poblacionObjetivo',
  'requisitos',
] as const;

/** Cuenta los campos de progreso válidos según el schema compartido (sin duplicar reglas). */
export function progresoFicha(valores: Partial<FichaInput>): { completos: number; total: number } {
  const r = fichaSchema.safeParse(valores);
  const malos = new Set<PropertyKey>(r.success ? [] : r.error.issues.map((i) => i.path[0]!));
  return {
    completos: CAMPOS_PROGRESO.filter((c) => !malos.has(c)).length,
    total: CAMPOS_PROGRESO.length,
  };
}
