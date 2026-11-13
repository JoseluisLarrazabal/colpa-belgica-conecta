import { dateAFecha, dateAHora, fechaADate, hora12, horaADate } from '../lib/fechas';

it('RF-04: fecha <-> Date usa componentes locales (sin correr un día)', () => {
  const d = fechaADate('2026-12-01');
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 1, 0]);
  expect(dateAFecha(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31');
  expect(dateAFecha(new Date(2026, 11, 1, 0, 5))).toBe('2026-12-01');
  expect(dateAFecha(fechaADate('2028-02-29'))).toBe('2028-02-29');
});

it('RF-04: hora <-> Date en HH:MM local', () => {
  const d = horaADate('23:30');
  expect([d.getHours(), d.getMinutes()]).toEqual([23, 30]);
  expect(dateAHora(new Date(2026, 5, 1, 0, 5))).toBe('00:05');
  expect(dateAHora(horaADate('23:30'))).toBe('23:30');
});

it('hora12: 24 h -> 12 h con a. m./p. m.', () => {
  expect(hora12('14:30')).toBe('2:30 p. m.');
  expect(hora12('08:05')).toBe('8:05 a. m.');
  expect(hora12('00:15')).toBe('12:15 a. m.');
  expect(hora12('12:00')).toBe('12:00 p. m.');
});
