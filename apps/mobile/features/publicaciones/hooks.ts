import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Accion, DevolverInput, EditarFichaInput, Estado, FichaInput } from '@colpa/shared';
import { api } from '../../lib/api';
import type { PublicacionDto } from './tipos';

const RUTA_ACCION: Record<Accion, string> = {
  ENVIAR_REVISION: 'enviar',
  PUBLICAR: 'publicar',
  DEVOLVER: 'devolver',
  ARCHIVAR: 'archivar',
};

export const usePublicaciones = (estado?: Estado) =>
  useQuery({
    queryKey: ['publicaciones', estado ?? 'todas'],
    queryFn: () =>
      api<PublicacionDto[]>(`/panel/publicaciones${estado ? `?estado=${estado}` : ''}`),
  });

export const usePublicacion = (id: string | undefined) =>
  useQuery({
    queryKey: ['publicacion', id],
    enabled: !!id,
    queryFn: () => api<PublicacionDto>(`/panel/publicaciones/${id}`),
  });

/** Toda mutación invalida listas y detalle: el servidor es la única fuente de verdad. */
function useInvalidar() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['publicaciones'] }),
      qc.invalidateQueries({ queryKey: ['publicacion'] }),
    ]);
}

export function useCrear() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (ficha: FichaInput) =>
      api<PublicacionDto>('/panel/publicaciones', { metodo: 'POST', cuerpo: ficha }),
    onSuccess: invalidar,
  });
}

export function useEditar(id: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (cambios: EditarFichaInput) =>
      api<PublicacionDto>(`/panel/publicaciones/${id}`, { metodo: 'PATCH', cuerpo: cambios }),
    onSuccess: invalidar,
  });
}

/** Enviar, publicar, devolver y archivar: mismo endpoint de máquina de estados con otra acción. */
export function useAccion(accion: Accion) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cuerpo }: { id: string } & DevolverInput) =>
      api<PublicacionDto>(`/panel/publicaciones/${id}/${RUTA_ACCION[accion]}`, {
        metodo: 'POST',
        cuerpo: accion === 'DEVOLVER' ? cuerpo : undefined,
      }),
    onSuccess: invalidar,
  });
}
