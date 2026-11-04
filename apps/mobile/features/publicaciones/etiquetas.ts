import type { Modulo, TipoPublicacion } from '@colpa/shared';

export const ETIQUETA_MODULO: Record<Modulo, string> = {
  SALUD: 'Salud',
  EDUCACION: 'Educación',
  EVENTOS: 'Eventos',
};

export const ETIQUETA_TIPO: Record<TipoPublicacion, string> = {
  CAMPANA_VACUNACION: 'Vacunación',
  JORNADA_ATENCION: 'Jornada',
  ENTREGA_MEDICAMENTOS: 'Entrega',
  COMUNICADO_SANITARIO: 'Comunicado',
  ACTIVIDAD_ESCOLAR: 'Actividad escolar',
  COMUNICADO_EDUCACION: 'Comunicado',
  FERIA: 'Feria',
  REUNION_VECINAL: 'Reunión vecinal',
  ACTIVIDAD_CULTURAL: 'Cultural',
  ACTIVIDAD_DEPORTIVA: 'Deportiva',
};

/** Rótulo de los campos extra por tipo (los nombres salen de `camposExtra` de @colpa/shared). */
export const ETIQUETA_CAMPO: Record<string, string> = {
  tipoVacuna: 'Tipo de vacuna',
};
