import '../lib/zod-es';
import { fichaSchema, type FichaInput } from '@colpa/shared';
import { moduloDeTipo, parche, progresoFicha } from '../features/publicaciones/ficha';
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
    hora: '08:00',
    imagenes: [],
  } as unknown as PublicacionDto;

  it('envía solo lo cambiado y no vacío', () => {
    const v = { ...completa, lugar: 'Otra posta', requisitos: '   ' };
    expect(parche(v, actual, ['tipoVacuna'])).toEqual({ lugar: 'Otra posta' });
  });

  it('incluye los campos extra del tipo', () => {
    expect(parche({ ...completa, tipoVacuna: 'Polio' }, actual, ['tipoVacuna'])).toEqual({
      tipoVacuna: 'Polio',
    });
  });
});

it('deriva el módulo desde el tipo del catálogo', () => {
  expect(moduloDeTipo('FERIA')).toBe('EVENTOS');
  expect(moduloDeTipo('CAMPANA_VACUNACION')).toBe('SALUD');
});
