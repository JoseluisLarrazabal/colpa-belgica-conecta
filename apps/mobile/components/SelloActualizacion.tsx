import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { momento } from '../lib/fechas';
import { colores } from '../theme';
import { Txt } from './Txt';

/** Sello de frescura: siempre visible en pantallas de lectura. `fecha` = última vez que se obtuvo del servidor. */
export function SelloActualizacion({ fecha }: { fecha: Date | number | null }) {
  return (
    <View style={s.fila} accessibilityRole="text">
      <MaterialCommunityIcons name="check-circle" size={20} color={colores.success} />
      <Txt v="t14" tenue>
        {fecha ? `Actualizado ${momento(new Date(fecha))}` : 'Sin actualizar todavía'}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 16,
  },
});
