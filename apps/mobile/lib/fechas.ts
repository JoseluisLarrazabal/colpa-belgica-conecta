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
