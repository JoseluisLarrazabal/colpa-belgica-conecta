import { FlatList, StyleSheet } from 'react-native';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { SelloActualizacion } from '../../components/SelloActualizacion';
import { usePublicasSalud } from '../../features/publico/hooks';
import { abrirPublicacion } from '../../features/publico/navegar';
import { SIN_RED_HABITANTE, masReciente } from '../../features/publico/texto';
import { FilaPublica } from '../../features/publico/TarjetaPublica';

/** Lista de Salud (RF-15): publicaciones vigentes del módulo. */
export default function Salud() {
  const q = usePublicasSalud();
  return (
    <Pantalla
      titulo="Salud"
      textoSinRed={SIN_RED_HABITANTE}
      banda={<SelloActualizacion fecha={masReciente(q.data?.generadoEn)} />}
    >
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data.datos}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <FilaPublica p={item} onAbrir={abrirPublicacion} />}
          onRefresh={() => void q.refetch()}
          refreshing={q.isRefetching}
          ListEmptyComponent={<Vacio texto="No hay publicaciones de salud por ahora." />}
          contentContainerStyle={s.lista}
        />
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({ lista: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 } });
