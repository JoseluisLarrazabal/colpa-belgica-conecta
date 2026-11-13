import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrearCuentaInput, EditarCuentaInput, Rol } from '@colpa/shared';
import { api } from '../../lib/api';
import type { CuentaDto, UnidadDto } from './tipos';

export const useCuentas = () =>
  useQuery({ queryKey: ['cuentas'], queryFn: () => api<CuentaDto[]>('/admin/funcionarios') });

export const useUnidades = () =>
  useQuery({ queryKey: ['unidades'], queryFn: () => api<UnidadDto[]>('/admin/unidades') });

/** Toda mutación invalida la lista de cuentas: el servidor es la única fuente de verdad. */
function useInvalidar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['cuentas'] });
  };
}

export function useCrearCuenta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (d: CrearCuentaInput) =>
      api<CuentaDto>('/admin/funcionarios', { metodo: 'POST', cuerpo: d }),
    onSuccess: invalidar,
  });
}

export function useEditarCuenta() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & EditarCuentaInput) =>
      api<CuentaDto>(`/admin/funcionarios/${id}`, { metodo: 'PATCH', cuerpo: cambios }),
    onSuccess: invalidar,
  });
}

export function useAsignarRol() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: Rol }) =>
      api<CuentaDto>(`/admin/funcionarios/${id}/rol`, { metodo: 'PUT', cuerpo: { rol } }),
    onSuccess: invalidar,
  });
}
