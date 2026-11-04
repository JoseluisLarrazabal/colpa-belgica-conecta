import { ScrollView, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { idParamSchema } from '@colpa/shared';
import { Cargando, ErrorCarga } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { SelloActualizacion } from '../../components/SelloActualizacion';
import { ETIQUETA_MODULO } from '../../features/publicaciones/etiquetas';
import { VistaPublicacion } from '../../features/publicaciones/VistaPublicacion';
import { usePublica } from '../../features/publico/hooks';
import { SIN_RED_HABITANTE, masReciente } from '../../features/publico/texto';

/** P-03 Detalle: la publicación completa tal como la publicó el funcionario. */
export default function DetalleHabitante() {
  const lp = useLocalSearchParams();
  const params = idParamSchema.safeParse(lp);
  const q = usePublica(params.success ? params.data.id : undefined);
  if (!params.success) return <Redirect href="/" />;

  const p = q.data?.publicacion;
  return (
    <Pantalla
      titulo={p ? ETIQUETA_MODULO[p.modulo] : 'Publicación'}
      atras
      textoSinRed={SIN_RED_HABITANTE}
      banda={<SelloActualizacion fecha={masReciente(q.data?.generadoEn)} />}
    >
      {q.isError ? (
        <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
      ) : !p ? (
        <Cargando />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <VistaPublicacion p={{ ...p, imagenes: p.imagenes.map((url) => ({ id: url, url })) }} />
        </ScrollView>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({ scroll: { paddingHorizontal: 16, paddingBottom: 24 } });
