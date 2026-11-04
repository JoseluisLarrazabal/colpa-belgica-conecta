import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Estado } from '@colpa/shared';
import { ChipElegir } from '../../../components/ChipElegir';
import { Pantalla } from '../../../components/Pantalla';
import { ListaPublicaciones } from '../../../features/publicaciones/ListaPublicaciones';
import type { PublicacionDto } from '../../../features/publicaciones/tipos';
import { colores } from '../../../theme';

const FILTROS: { estado: Estado; texto: string }[] = [
  { estado: 'BORRADOR', texto: 'Borradores' },
  { estado: 'EN_REVISION', texto: 'En revisión' },
  { estado: 'PUBLICADO', texto: 'Publicadas' },
  { estado: 'ARCHIVADO', texto: 'Archivadas' },
];
const VACIO: Record<Estado, string> = {
  BORRADOR: 'No tiene borradores.',
  EN_REVISION: 'No tiene publicaciones en revisión.',
  PUBLICADO: 'Todavía no tiene publicaciones publicadas.',
  ARCHIVADO: 'No tiene publicaciones archivadas.',
};

/** Mis publicaciones, por estado (Publicador). */
export default function MisPublicaciones() {
  const [estado, setEstado] = useState<Estado>('BORRADOR');
  const abrir = useCallback(
    (p: PublicacionDto) =>
      router.push({ pathname: '/(panel)/publicaciones/[id]', params: { id: p.id } }),
    [],
  );
  return (
    <Pantalla
      titulo="Mis publicaciones"
      atras
      derecha={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nueva publicación"
          onPress={() => router.push('/(panel)/publicaciones/nueva')}
          style={s.ib}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colores.primary} />
        </Pressable>
      }
    >
      <View style={s.filtros}>
        {FILTROS.map((f) => (
          <ChipElegir
            key={f.estado}
            texto={f.texto}
            activo={estado === f.estado}
            onPress={() => setEstado(f.estado)}
          />
        ))}
      </View>
      <ListaPublicaciones estado={estado} vacio={VACIO[estado]} onAbrir={abrir} />
    </Pantalla>
  );
}

const s = StyleSheet.create({
  ib: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
