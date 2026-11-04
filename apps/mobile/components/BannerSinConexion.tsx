import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colores } from '../theme';
import { Txt } from './Txt';

/** Banda neutra (no alarma): estar sin conexión es lo normal en zonas rurales. */
export function BannerSinConexion() {
  return (
    <View style={s.banda} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="wifi-off" size={24} color="#FFFFFF" />
      <Txt v="t14m" color="#FFFFFF" style={s.texto}>
        Sin conexión · no se puede guardar ni enviar
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  banda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colores.onSurfaceVariant,
  },
  texto: { flex: 1 },
});
