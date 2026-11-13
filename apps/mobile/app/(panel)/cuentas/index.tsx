import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Boton } from '../../../components/Boton';
import { Cargando, ErrorCarga, Vacio } from '../../../components/Estados';
import { Pantalla } from '../../../components/Pantalla';
import { Txt } from '../../../components/Txt';
import { ETIQUETA_ROL } from '../../../features/cuentas/etiquetas';
import { useCuentas, useUnidades } from '../../../features/cuentas/hooks';
import type { CuentaDto } from '../../../features/cuentas/tipos';
import { colores } from '../../../theme';

const Fila = memo(function Fila({ c, unidad }: { c: CuentaDto; unidad: string }) {
  const detalle = `${c.identificadorCuenta} · ${ETIQUETA_ROL[c.rol]} · ${unidad}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.nombreCompleto}. ${detalle}${c.activo ? '' : '. Inactiva'}`}
      onPress={() => router.push({ pathname: '/(panel)/cuentas/[id]', params: { id: c.id } })}
      style={s.fila}
    >
      <View style={s.texto}>
        <Txt v="t16m">{c.nombreCompleto}</Txt>
        <Txt v="t14" tenue>
          {detalle}
        </Txt>
        {!c.activo && (
          <View style={s.inactiva}>
            <MaterialCommunityIcons name="cancel" size={20} color={colores.onSurfaceVariant} />
            <Txt v="t14m">Inactiva</Txt>
          </View>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colores.onSurfaceVariant} />
    </Pressable>
  );
});

/** RF-02: cuentas de funcionarios (Administrador técnico). */
export default function ListaCuentas() {
  const q = useCuentas();
  const unidades = useUnidades();
  const nombreUnidad = useCallback(
    (id: string) => unidades.data?.find((u) => u.id === id)?.nombre ?? '',
    [unidades.data],
  );
  return (
    <Pantalla
      titulo="Cuentas"
      atras
      acciones={
        <Boton
          texto="Nueva cuenta"
          icono="plus"
          onPress={() => router.push('/(panel)/cuentas/nueva')}
        />
      }
    >
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <ErrorCarga mensaje={q.error.message} onReintentar={() => void q.refetch()} />
      ) : (
        <FlatList
          data={q.data}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <Fila c={item} unidad={nombreUnidad(item.unidadId)} />}
          onRefresh={() => void q.refetch()}
          refreshing={q.isRefetching}
          ListEmptyComponent={<Vacio texto="Todavía no hay cuentas." />}
          contentContainerStyle={s.lista}
        />
      )}
    </Pantalla>
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
  texto: { flex: 1, gap: 2 },
  inactiva: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
});
