import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIO, colores } from '../theme';
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

/** Error de una acción (guardar, enviar, entrar) dentro de un formulario o pantalla. */
export function CajaError({ mensaje }: { mensaje: string }) {
  return (
    <View style={s.caja} accessibilityRole="alert">
      <MaterialCommunityIcons name="alert-circle" size={24} color={colores.error} />
      <Txt v="t14m" style={s.cajaTexto}>
        {mensaje}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 48,
    marginTop: 12,
    padding: 12,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.error,
    backgroundColor: colores.surface,
  },
  cajaTexto: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
});
