import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colores } from '../theme';
import { Boton } from './Boton';
import { Txt } from './Txt';

export function Cargando() {
  return (
    <View style={s.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colores.primary} />
      <Txt v="t14" tenue>
        Cargando…
      </Txt>
    </View>
  );
}

export function ErrorCarga({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar: () => void;
}) {
  return (
    <View style={s.centro}>
      <MaterialCommunityIcons name="alert-circle" size={32} color={colores.error} />
      <Txt v="t16m" accessibilityRole="alert">
        No se pudo cargar
      </Txt>
      <Txt v="t14" tenue>
        {mensaje}
      </Txt>
      <Boton texto="Reintentar" variante="borde" icono="refresh" onPress={onReintentar} />
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <View style={s.centro}>
      <MaterialCommunityIcons name="inbox-outline" size={32} color={colores.onSurfaceVariant} />
      <Txt v="t16">{texto}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
});
