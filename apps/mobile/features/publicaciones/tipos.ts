import type { Estado, Modulo, TipoPublicacion } from '@colpa/shared';

// @colpa/shared define la entrada (schemas) pero no la forma de la respuesta de la API
// (`aDto` en apps/api/src/services/publicacion.service.ts). Se declara aquí, una sola vez.
export interface ImagenDto {
  id: string;
  url: string;
  publicId: string;
  orden: number;
}

export interface PublicacionDto {
  id: string;
  modulo: Modulo;
  tipo: TipoPublicacion;
  titulo: string;
  detalle: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  hora: string | null;
  lugar: string | null;
  poblacionObjetivo: string | null;
  requisitos: string | null;
  tipoVacuna: string | null;
  estado: Estado;
  observaciones: string | null;
  unidadId: string;
  autorId: string;
  publicadoEn: string | null;
  actualizadoEn: string;
  /** Solo en GET /panel/publicaciones/:id. */
  imagenes?: ImagenDto[];
}
