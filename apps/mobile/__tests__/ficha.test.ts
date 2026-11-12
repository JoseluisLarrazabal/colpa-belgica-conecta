import '../lib/zod-es';
import { fichaSchema, type FichaInput } from '@colpa/shared';
import { moduloDeTipo, parche, progresoFicha, vaciados } from '../features/publicaciones/ficha';
import type { PublicacionDto } from '../features/publicaciones/tipos';

const completa = {
  modulo: 'SALUD',
  tipo: 'CAMPANA_VACUNACION',
  titulo: 'Campaña de vacunación',
  detalle: 'Detalle',
  fechaInicio: '2026-11-15',
  hora: '08:00',
  lugar: 'Posta de salud',
  poblacionObjetivo: 'Niñas y niños de 0 a 5 años',
  requisitos: 'Llevar el carné',
  tipoVacuna: 'Sarampión',
} as FichaInput;

describe('progreso de la ficha', () => {
  it('cuenta 5 de 5 con la ficha completa', () => {
    expect(progresoFicha(completa)).toEqual({ completos: 5, total: 5 });
  });

  it('cuenta 0 con campos vacíos', () => {
    const vacia = {
      ...completa,
      fechaInicio: '',
      hora: '',
      lugar: '',
      poblacionObjetivo: '',
      requisitos: '',
    };
    expect(progresoFicha(vacia).completos).toBe(0);
  });

  it('no cuenta un campo con formato inválido (hora)', () => {
    expect(progresoFicha({ ...completa, hora: '8 de la mañana' } as FichaInput).completos).toBe(4);
  });

  it('un campo vacío da mensaje en español, no el de zod por defecto', () => {
    const r = fichaSchema.safeParse({ ...completa, lugar: '' });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues.find((i) => i.path[0] === 'lugar')?.message).toBe(
        'Este campo es obligatorio',
      );
  });
});

describe('parche de edición', () => {
  const actual = {
    ...completa,
    estado: 'BORRADOR',
    destacado: false,
    hora: '08:00',
    imagenes: [],
  } as unknown as PublicacionDto;

  it('envía solo lo cambiado y no vacío', () => {
    const v = { ...completa, lugar: 'Otra posta', requisitos: '   ' };
    expect(parche(v, actual, ['tipoVacuna'])).toEqual({ lugar: 'Otra posta' });
  });

  it('envía fechaFin al agregarla o cambiarla', () => {
    expect(parche({ ...completa, fechaFin: '2026-11-17' }, actual, [])).toEqual({
      fechaFin: '2026-11-17',
    });
    expect(parche({ ...completa, fechaFin: '' }, actual, [])).toEqual({});
  });

  it('fechaFin vaciada se envía como null y no cuenta como vaciado', () => {
    const conFin = { ...actual, fechaFin: '2026-11-17' } as PublicacionDto;
    const v = { ...completa, fechaFin: '' };
    expect(parche(v, conFin, [])).toEqual({ fechaFin: null });
    expect(vaciados(v, conFin, [])).toEqual([]);
  });

  it('incluye los campos extra del tipo', () => {
    expect(parche({ ...completa, tipoVacuna: 'Polio' }, actual, ['tipoVacuna'])).toEqual({
      tipoVacuna: 'Polio',
    });
  });
});

describe('destacado y campos vaciados', () => {
  const actual = { ...completa, estado: 'BORRADOR', destacado: false } as unknown as PublicacionDto;

  it('envía destacado solo si cambió', () => {
    expect(parche({ ...completa, destacado: true }, actual, [])).toEqual({ destacado: true });
    expect(parche({ ...completa, destacado: false }, actual, [])).toEqual({});
    expect(parche({ ...completa, destacado: false }, { ...actual, destacado: true }, [])).toEqual({
      destacado: false,
    });
  });

  it('detecta los campos con valor que el usuario dejó vacíos', () => {
    const v = { ...completa, lugar: '  ', tipoVacuna: '' };
    expect(vaciados(v, actual, ['tipoVacuna'])).toEqual(['lugar', 'tipoVacuna']);
    expect(parche(v, actual, ['tipoVacuna'])).toEqual({});
  });

  it('un campo que ya estaba vacío no cuenta como vaciado', () => {
    expect(vaciados({ ...completa, requisitos: '' }, { ...actual, requisitos: null }, [])).toEqual(
      [],
    );
  });
});

it('deriva el módulo desde el tipo del catálogo', () => {
  expect(moduloDeTipo('FERIA')).toBe('EVENTOS');
  expect(moduloDeTipo('CAMPANA_VACUNACION')).toBe('SALUD');
});
