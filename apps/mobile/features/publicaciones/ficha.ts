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

const EDITABLES = [
  'titulo',
  'detalle',
  'fechaInicio',
  'hora',
  'lugar',
  'poblacionObjetivo',
  'requisitos',
] as const;

/**
 * Cambios para PATCH: solo campos no vacíos y distintos de lo guardado.
 * La API rechaza strings vacíos en la edición, por eso un campo borrado no se envía.
 */
export function parche(
  valores: Record<string, unknown>,
  actual: PublicacionDto,
  extras: readonly string[],
): EditarFichaInput {
  const previo = actual as unknown as Record<string, string | null>;
  const out: Record<string, string> = {};
  for (const k of [...EDITABLES, ...extras]) {
    const nuevo = String(valores[k] ?? '').trim();
    if (nuevo && nuevo !== (previo[k] ?? '')) out[k] = nuevo;
  }
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
