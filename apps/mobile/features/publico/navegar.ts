import { router } from 'expo-router';
import type { PublicacionPublicaDto } from '@colpa/shared';

export const abrirPublicacion = (p: PublicacionPublicaDto) =>
  router.push({ pathname: '/publicacion/[id]', params: { id: p.id } });
