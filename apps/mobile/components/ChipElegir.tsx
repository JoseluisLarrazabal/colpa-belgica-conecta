import { Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OBJETIVO_TACTIL, RADIO, colores } from '../theme';
import { Txt } from './Txt';

interface Props {
  texto: string;
  activo: boolean;
  onPress?: () => void;
  deshabilitado?: boolean;
}

/** Chip de selección (≥48 dp): activo = Primary Container + borde 2 dp + check. */
export function ChipElegir({ texto, activo, onPress, deshabilitado }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo, disabled: !!deshabilitado }}
      disabled={deshabilitado || !onPress}
      onPress={onPress}
      style={[s.chip, activo && s.activo, deshabilitado && !activo && s.off]}
    >
      {activo && <MaterialCommunityIcons name="check-circle" size={20} color={colores.primary} />}
      <Txt v="t14m" color={activo ? colores.onPrimaryContainer : colores.onSurface}>
        {texto}
      </Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    minHeight: OBJETIVO_TACTIL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.outline,
    backgroundColor: colores.surface,
  },
  activo: {
    backgroundColor: colores.primaryContainer,
    borderColor: colores.primary,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  off: { opacity: 0.5 },
});
