const OFFSET_LA_PAZ_MS = -4 * 3_600_000;

// shortcut: America/La_Paz fija en UTC-4 (Bolivia no tiene horario de verano); parametrizar si se atiende otra zona.
/** Día calendario en La Paz de un instante, como 'YYYY-MM-DD'. */
export const hoyLaPaz = (ahora: Date = new Date()) =>
  new Date(ahora.getTime() + OFFSET_LA_PAZ_MS).toISOString().slice(0, 10);
