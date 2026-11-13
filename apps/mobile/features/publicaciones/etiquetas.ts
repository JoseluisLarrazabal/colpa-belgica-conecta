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

/** Texto de ayuda bajo cada campo (los extra se resuelven por nombre, igual que su rótulo). */
export const AYUDA_CAMPO: Record<string, string> = {
  titulo: 'Nombre corto de la actividad. Ejemplo: Vacunación contra la influenza.',
  fechaInicio: 'Día en que empieza.',
  fechaFin: 'Solo si dura más de un día.',
  hora: 'Hora de inicio.',
  lugar: 'Dónde se realiza. Ejemplo: Centro de salud.',
  poblacionObjetivo: 'A quiénes va dirigido. Ejemplo: Niños menores de 5 años.',
  requisitos: 'Qué debe llevar o cumplir la persona. Ejemplo: Carnet de vacunas.',
  detalle: 'Explique con palabras sencillas qué se hará.',
  tipoVacuna: 'Nombre de la vacuna. Ejemplo: Influenza.',
};
