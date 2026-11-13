import { useCallback } from 'react';
import { router } from 'expo-router';
import { Pantalla } from '../../../components/Pantalla';
import { ListaPublicaciones } from '../../../features/publicaciones/ListaPublicaciones';
import type { PublicacionDto } from '../../../features/publicaciones/tipos';

/** Publicadas (Aprobador): punto de entrada para archivar; todas las unidades. */
export default function Publicadas() {
  const abrir = useCallback(
    (p: PublicacionDto) =>
      router.push({ pathname: '/(panel)/revision/[id]', params: { id: p.id } }),
    [],
  );
  return (
    <Pantalla titulo="Publicadas" atras>
      <ListaPublicaciones
        estado="PUBLICADO"
        vacio="No hay publicaciones publicadas."
        onAbrir={abrir}
      />
    </Pantalla>
  );
}
