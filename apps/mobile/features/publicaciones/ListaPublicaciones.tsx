import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Estado } from '@colpa/shared';
import { fechaLarga } from '../../lib/fechas';
import { Cargando, ErrorCarga, Vacio } from '../../components/Estados';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { SelloActualizacion } from '../../components/SelloActualizacion';
import { Txt } from '../../components/Txt';
import { colores } from '../../theme';
import { ETIQUETA_MODULO, ETIQUETA_TIPO } from './etiquetas';
import { usePublicaciones } from './hooks';
import type { PublicacionDto } from './tipos';

interface Props {
  estado?: Estado;
  vacio: string;
  onAbrir: (p: PublicacionDto) => void;
}

const Fila = memo(function Fila({ p, onAbrir }: { p: PublicacionDto; onAbrir: Props['onAbrir'] }) {
  const sub = [p.fechaInicio && fechaLarga(p.fechaInicio), p.lugar].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.titulo}. ${ETIQUETA_TIPO[p.tipo]}`}
      onPress={() => onAbrir(p)}
      style={s.fila}
    >
      <View style={s.tile}>
        <MaterialCommunityIcons
          name="file-document-outline"
          size={24}
          color={colores.onPrimaryContainer}
        />
      </View>
      <View style={s.texto}>
        <Txt v="t16m" numberOfLines={2}>
          {p.titulo}
        </Txt>
        <Txt v="t14" tenue numberOfLines={2}>
          {`${ETIQUETA_MODULO[p.modulo]} · ${ETIQUETA_TIPO[p.tipo]}${sub ? ` · ${sub}` : ''}`}
        </Txt>
        <View style={s.chip}>
          <EstadoChip estado={estadoVisual(p)} />
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colores.onSurfaceVariant} />
    </Pressable>
  );
});

/** Lista genérica de publicaciones del panel (Mis publicaciones y cola de revisión). */
export function ListaPublicaciones({ estado, vacio, onAbrir }: Props) {
  const q = usePublicaciones(estado);
  const render = useCallback(
    ({ item }: { item: PublicacionDto }) => <Fila p={item} onAbrir={onAbrir} />,
    [onAbrir],
  );

  if (q.isPending) return <Cargando />;
  if (q.isError)
    return <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />;
  return (
    <FlatList
      data={q.data}
      keyExtractor={(p) => p.id}
      renderItem={render}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      ListHeaderComponent={<SelloActualizacion fecha={q.dataUpdatedAt} />}
      ListEmptyComponent={<Vacio texto={vacio} />}
      contentContainerStyle={s.lista}
    />
  );
}

const s = StyleSheet.create({
  lista: { paddingHorizontal: 16, paddingBottom: 16 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colores.primaryContainer,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colores.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: 2 },
  chip: { marginTop: 4 },
});
