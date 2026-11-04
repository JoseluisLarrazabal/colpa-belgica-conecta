import { Redirect, useLocalSearchParams } from 'expo-router';
import { idParamSchema } from '@colpa/shared';
import { Cargando, ErrorCarga } from '../../../components/Estados';
import { Pantalla } from '../../../components/Pantalla';
import { usePublicacion } from '../../../features/publicaciones/hooks';
import { RevisionPublicacion } from '../../../features/publicaciones/RevisionPublicacion';

/** P-18: revisión de una publicación (Aprobador). */
export default function Revisar() {
  const params = idParamSchema.safeParse(useLocalSearchParams());
  const q = usePublicacion(params.success ? params.data.id : undefined);
  if (!params.success) return <Redirect href="/(panel)/revision" />;
  if (q.isPending || q.isError) {
    return (
      <Pantalla titulo="Revisar publicación" atras>
        {q.isError ? (
          <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
        ) : (
          <Cargando />
        )}
      </Pantalla>
    );
  }
  return <RevisionPublicacion p={q.data} />;
}
