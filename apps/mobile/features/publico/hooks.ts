import { useQuery } from '@tanstack/react-query';
import type { DetallePublicoResp, ListaPublicaResp } from '@colpa/shared';
import { api } from '../../lib/api';

// Lecturas públicas (RF-15/16): sin token. El servidor es la fuente de verdad; `generadoEn` alimenta el sello.
const leer = <T>(ruta: string) => api<T>(ruta, { autenticado: false });

/** RF-16: comunicados destacados vigentes (máx. 10 en el servidor). */
export const useDestacadas = () =>
  useQuery({
    queryKey: ['publico', 'destacadas'],
    queryFn: () => leer<ListaPublicaResp>('/publicaciones/destacadas'),
  });

/** RF-16: vigentes de todos los módulos, por fecha. */
export const useProximas = () =>
  useQuery({
    queryKey: ['publico', 'proximas'],
    queryFn: () => leer<ListaPublicaResp>('/publicaciones?limite=20'),
  });

/** RF-15: publicaciones vigentes de Salud. shortcut: una sola página (50); paginar si el volumen lo pide. */
export const usePublicasSalud = () =>
  useQuery({
    queryKey: ['publico', 'lista', 'SALUD'],
    queryFn: () => leer<ListaPublicaResp>('/publicaciones?modulo=SALUD'),
  });

export const usePublica = (id: string | undefined) =>
  useQuery({
    queryKey: ['publico', 'detalle', id],
    enabled: !!id,
    queryFn: () => leer<DetallePublicoResp>(`/publicaciones/${id}`),
  });
