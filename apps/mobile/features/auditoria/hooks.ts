import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { RespuestaAuditoria } from './tipos';

export const PAGINA = 50;

export const useAuditoria = (f: { accion?: string; publicacionId?: string }) =>
  useInfiniteQuery({
    queryKey: ['auditoria', f.accion ?? null, f.publicacionId ?? null],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limite: String(PAGINA), desplazamiento: String(pageParam) });
      if (f.accion) q.set('accion', f.accion);
      if (f.publicacionId) q.set('publicacionId', f.publicacionId);
      return api<RespuestaAuditoria>(`/admin/auditoria?${q.toString()}`);
    },
    getNextPageParam: (ultima, _p, ultimo) =>
      ultima.registros.length === PAGINA ? ultimo + PAGINA : undefined,
  });
