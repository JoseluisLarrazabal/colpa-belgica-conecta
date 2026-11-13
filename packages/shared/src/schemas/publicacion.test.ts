import { editarFichaSchema, fichaCompletaSchema, fichaSchema } from './publicacion';
import { hoyLaPaz } from '../dominio/hoy';

const enDias = (n: number) => hoyLaPaz(new Date(Date.now() + n * 86_400_000));
const ficha = (fechaInicio: string) => ({
  modulo: 'SALUD',
  tipo: 'CAMPANA_VACUNACION',
  titulo: 'Campaña',
  detalle: 'Detalle',
  fechaInicio,
  hora: '08:00',
  lugar: 'Posta',
  poblacionObjetivo: 'Todos',
  requisitos: 'Ninguno',
  tipoVacuna: 'Sarampión',
});

describe('la fecha de inicio no puede ser anterior a hoy (La Paz)', () => {
  it('rechaza ayer con el mensaje sobre fechaInicio', () => {
    const r = fichaSchema.safeParse(ficha(enDias(-1)));
    expect(r.success).toBe(false);
    expect(r.error?.issues).toContainEqual(
      expect.objectContaining({
        path: ['fechaInicio'],
        message: 'La fecha de inicio no puede ser anterior a hoy',
      }),
    );
  });

  it('acepta hoy y mañana', () => {
    expect(fichaSchema.safeParse(ficha(enDias(0))).success).toBe(true);
    expect(fichaSchema.safeParse(ficha(enDias(1))).success).toBe(true);
  });

  it('la ficha ya guardada se revalida sin la regla (envío a revisión)', () => {
    expect(fichaCompletaSchema.safeParse(ficha(enDias(-1))).success).toBe(true);
  });

  it('edición: valida solo si viene fechaInicio', () => {
    expect(editarFichaSchema.safeParse({ lugar: 'Otro' }).success).toBe(true);
    expect(editarFichaSchema.safeParse({ fechaInicio: enDias(-1) }).success).toBe(false);
    expect(editarFichaSchema.safeParse({ fechaInicio: enDias(0) }).success).toBe(true);
  });
});
