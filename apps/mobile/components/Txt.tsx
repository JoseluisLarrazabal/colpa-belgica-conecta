import { Text, type TextProps } from 'react-native';
import { colores, tipo, type VarianteTipo } from '../theme';

interface Props extends TextProps {
  v?: VarianteTipo;
  /** Texto secundario (On Surface Variant). */
  tenue?: boolean;
  color?: string;
}

/** Texto con la escala de la propuesta C. allowFontScaling queda activo (RNF-03, 200 %). */
export function Txt({ v = 't16', tenue, color, style, ...rest }: Props) {
  return (
    <Text
      allowFontScaling
      style={[
        tipo[v],
        { color: color ?? (tenue ? colores.onSurfaceVariant : colores.onSurface) },
        style,
      ]}
      {...rest}
    />
  );
}
