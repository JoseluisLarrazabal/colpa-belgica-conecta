import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { SelloActualizacion } from '../../components/SelloActualizacion';
import { usePublicasSalud } from '../../features/publico/hooks';
import { abrirPublicacion } from '../../features/publico/navegar';
import { SIN_RED_HABITANTE, masAntiguo } from '../../features/publico/texto';
import { FilaPublica } from '../../features/publico/TarjetaPublica';

/** Lista de Salud (RF-15): publicaciones vigentes del módulo. */
export default function Salud() {
  const q = usePublicasSalud();
  const [manual, setManual] = useState(false);

  async function actualizar() {
    setManual(true);
    await q.refetch();
    setManual(false);
  }

  return (
    <Pantalla
      titulo="Salud"
      textoSinRed={SIN_RED_HABITANTE}
      banda={<SelloActualizacion fecha={masAntiguo(q.data?.generadoEn)} />}
    >
      {q.isPending ? (
        <Cargando />
      ) : !q.data ? (
        <ErrorCarga mensaje={q.error!.message} onReintentar={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data.datos}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <FilaPublica p={item} onAbrir={abrirPublicacion} />}
          onRefresh={() => void actualizar()}
          refreshing={manual}
          ListEmptyComponent={<Vacio texto="No hay publicaciones de salud por ahora." />}
          contentContainerStyle={s.lista}
        />
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({ lista: { paddingHorizontal: 16, paddingBottom: 16, flexGrow: 1 } });
