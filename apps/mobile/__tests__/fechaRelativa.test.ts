import { fechaRelativa, hoyLaPaz } from '../lib/fechas';

describe('RF-16 fecha relativa de Próximas actividades (America/La_Paz)', () => {
  // 2026-11-05T02:00Z = miércoles 4 de noviembre, 22:00 en La Paz (UTC-4)
  const noche = new Date('2026-11-05T02:00:00Z');

  it('a las 22:00 en La Paz el día sigue siendo el 4 aunque en UTC ya sea el 5', () => {
    expect(hoyLaPaz(noche)).toBe('2026-11-04');
    expect(fechaRelativa('2026-11-04', noche)).toBe('Hoy');
    expect(fechaRelativa('2026-11-05', noche)).toBe('Mañana');
  });

  it('pasada la medianoche en La Paz cambia el día', () => {
    expect(fechaRelativa('2026-11-05', new Date('2026-11-05T04:00:00Z'))).toBe('Hoy');
  });

  it('usa "En N días" hasta 6 días y luego la fecha corta', () => {
    expect(fechaRelativa('2026-11-07', noche)).toBe('En 3 días');
    expect(fechaRelativa('2026-11-10', noche)).toBe('En 6 días');
    expect(fechaRelativa('2026-11-15', noche)).toBe('Dom 15 nov');
  });

  it('una actividad empezada y con fin vigente está "En curso"; terminada, muestra la fecha', () => {
    expect(fechaRelativa('2026-11-01', noche, '2026-11-06')).toBe('En curso');
    expect(fechaRelativa('2026-11-01', noche, '2026-11-03')).toBe('Dom 1 nov');
  });

  it('a las 01:00Z del 1-dic en La Paz aún es 30-nov: el 1-dic es "Mañana"', () => {
    expect(fechaRelativa('2026-12-01', new Date('2026-12-01T01:00:00Z'))).toBe('Mañana');
  });
});
