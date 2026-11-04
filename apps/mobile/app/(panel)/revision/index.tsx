import { useCallback } from 'react';
import { router } from 'expo-router';
import { Pantalla } from '../../../components/Pantalla';
import { ListaPublicaciones } from '../../../features/publicaciones/ListaPublicaciones';
import type { PublicacionDto } from '../../../features/publicaciones/tipos';

/** Cola de revisión (Aprobador): publicaciones En revisión de todas las unidades. */
export default function ColaRevision() {
  const abrir = useCallback(
    (p: PublicacionDto) =>
      router.push({ pathname: '/(panel)/revision/[id]', params: { id: p.id } }),
    [],
  );
  return (
    <Pantalla titulo="Revisión" atras>
      <ListaPublicaciones
        estado="EN_REVISION"
        vacio="No hay publicaciones esperando revisión."
        onAbrir={abrir}
      />
    </Pantalla>
  );
}
