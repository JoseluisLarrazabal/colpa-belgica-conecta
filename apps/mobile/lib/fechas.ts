import { hoyLaPaz } from '@colpa/shared';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const dos = (n: number) => String(n).padStart(2, '0');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 'YYYY-MM-DD' -> 'Sábado 15 de noviembre' (sin Intl: Hermes no garantiza el locale es). */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!;
  return `${cap(dia)} ${d} de ${MESES[m - 1]}`;
}

const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Instante -> 'hoy 08:15' | 'ayer 16:40' | '7 nov 09:00' (hora local). */
export function momento(fecha: Date | string, ahora: Date = new Date()): string {
  const f = new Date(fecha);
  const hora = `${dos(f.getHours())}:${dos(f.getMinutes())}`;
  if (mismoDia(f, ahora)) return `hoy ${hora}`;
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (mismoDia(f, ayer)) return `ayer ${hora}`;
  return `${f.getDate()} ${MESES[f.getMonth()]!.slice(0, 3)} ${hora}`;
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MS_DIA = 86_400_000;

/**
 * 'YYYY-MM-DD' -> 'Hoy' | 'Mañana' | 'En 3 días' (hasta 6) | 'Sáb 15 nov'.
 * Si ya empezó y `fin` aún no pasó: 'En curso'. Si terminó: la fecha corta.
 */
export function fechaRelativa(
  inicio: string,
  ahora: Date = new Date(),
  fin?: string | null,
): string {
  const dias = Math.round((Date.parse(inicio) - Date.parse(hoyLaPaz(ahora))) / MS_DIA);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias > 1 && dias < 7) return `En ${dias} días`;
  if (dias < 0 && fin && fin >= hoyLaPaz(ahora)) return 'En curso';
  const [a, m, d] = inicio.split('-').map(Number) as [number, number, number];
  const dia = DIAS_CORTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!;
  return `${dia[0]!.toUpperCase()}${dia.slice(1)} ${d} ${MESES[m - 1]!.slice(0, 3)}`;
}

// Conversiones con componentes LOCALES: toISOString() correría un día en La Paz (UTC-4).
/** 'YYYY-MM-DD' -> Date local a medianoche. */
export function fechaADate(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(a, m - 1, d);
}

/** Date local -> 'YYYY-MM-DD'. */
export const dateAFecha = (d: Date) =>
  `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

/** 'HH:MM' -> Date local de hoy a esa hora (valor inicial del selector). */
export function horaADate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Date local -> 'HH:MM'. */
export const dateAHora = (d: Date) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

/** 'HH:MM' (24 h) -> '2:30 p. m.' (sin Intl: Hermes no garantiza el locale es). */
export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return `${h % 12 || 12}:${dos(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}
