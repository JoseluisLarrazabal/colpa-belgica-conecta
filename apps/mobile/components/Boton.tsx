import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OBJETIVO_TACTIL, RADIO, colores } from '../theme';
import { Txt } from './Txt';

interface Props {
  texto: string;
  onPress: () => void;
  /** 'lleno' = acción primaria; 'borde' = secundaria. */
  variante?: 'lleno' | 'borde';
  icono?: keyof typeof MaterialCommunityIcons.glyphMap;
  deshabilitado?: boolean;
  cargando?: boolean;
  /** Ocupa el ancho disponible (flex: 1). */
  expandir?: boolean;
}

/** Botón de 48 dp, radio 8, según el diseño C. */
export function Boton({
  texto,
  onPress,
  variante = 'lleno',
  icono,
  deshabilitado,
  cargando,
  expandir,
}: Props) {
  const lleno = variante === 'lleno';
  const color = lleno ? colores.onPrimary : colores.primary;
  const off = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: !!off, busy: !!cargando }}
      disabled={off}
      onPress={onPress}
      style={[s.btn, lleno ? s.lleno : s.borde, expandir && s.expandir, off && s.off]}
    >
      <View style={s.contenido}>
        {cargando ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          icono && <MaterialCommunityIcons name={icono} size={20} color={color} />
        )}
        <Txt v="t14m" color={color}>
          {texto}
        </Txt>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    minHeight: OBJETIVO_TACTIL,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  lleno: { backgroundColor: colores.primary },
  borde: { backgroundColor: colores.surface },
  expandir: { flex: 1 },
  off: { opacity: 0.5 },
  contenido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
