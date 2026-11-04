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
// shortcut: America/La_Paz fija en UTC-4 (Bolivia no tiene horario de verano), igual que la API; parametrizar si se atiende otra zona.
const OFFSET_LA_PAZ_MS = -4 * 3_600_000;

/** Día calendario en La Paz de un instante, como 'YYYY-MM-DD'. */
export const hoyLaPaz = (ahora: Date = new Date()) =>
  new Date(ahora.getTime() + OFFSET_LA_PAZ_MS).toISOString().slice(0, 10);

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
