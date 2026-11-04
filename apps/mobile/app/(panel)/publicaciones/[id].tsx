import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { idParamSchema } from '@colpa/shared';
import { Cargando, ErrorCarga } from '../../../components/Estados';
import { EstadoChip, estadoVisual } from '../../../components/EstadoChip';
import { Pantalla } from '../../../components/Pantalla';
import { SelloActualizacion } from '../../../components/SelloActualizacion';
import { FormPublicacion } from '../../../features/publicaciones/FormPublicacion';
import { usePublicacion } from '../../../features/publicaciones/hooks';
import { VistaPublicacion } from '../../../features/publicaciones/VistaPublicacion';

/** Editar un borrador (o ver una publicación ya enviada, en solo lectura). */
export default function DetallePublicacion() {
  const params = idParamSchema.safeParse(useLocalSearchParams());
  const q = usePublicacion(params.success ? params.data.id : undefined);
  if (!params.success) return <Redirect href="/(panel)/publicaciones" />;

  if (q.isPending || q.isError) {
    return (
      <Pantalla titulo="Publicación" atras>
        {q.isError ? (
          <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
        ) : (
          <Cargando />
        )}
      </Pantalla>
    );
  }
  const p = q.data;
  if (p.estado === 'BORRADOR') return <FormPublicacion tipo={p.tipo} publicacion={p} />;
  return (
    <Pantalla titulo="Publicación" atras banda={<SelloActualizacion fecha={q.dataUpdatedAt} />}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.chip}>
          <EstadoChip estado={estadoVisual(p)} />
        </View>
        <VistaPublicacion p={p} />
      </ScrollView>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  chip: { marginTop: 12 },
});
