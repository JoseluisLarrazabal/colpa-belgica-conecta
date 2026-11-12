import type { Modulo, TipoPublicacion } from '../catalogo';

/** Forma de la respuesta pública (`aDtoPublico` en apps/api/src/services/publico.service.ts): sin autor ni auditoría. */
export interface PublicacionPublicaDto {
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
  unidadEducativa: string | null;
  destacado: boolean;
  unidad: string;
  imagenes: string[];
  publicadoEn: string | null;
  actualizadoEn: string;
}

/** `generadoEn`: instante en que el servidor armó la respuesta (sello de frescura). */
export interface ListaPublicaResp {
  datos: PublicacionPublicaDto[];
  generadoEn: string;
}
export interface DetallePublicoResp {
  publicacion: PublicacionPublicaDto;
  generadoEn: string;
}
