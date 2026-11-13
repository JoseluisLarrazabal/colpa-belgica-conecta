import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OBJETIVO_TACTIL, RADIO, colores, tipo } from '../theme';
import { Txt } from './Txt';

interface Props extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  error?: string;
  ayuda?: string;
  /** Sustituye a la entrada de texto (selectores); rótulo, error y ayuda se mantienen. */
  children?: ReactNode;
}

/** Campo del diseño C: rótulo 14 sp, entrada ≥48 dp, error con borde 2 dp + icono + texto. */
export function Campo({ rotulo, error, ayuda, multiline, children, ...rest }: Props) {
  return (
    <View style={s.campo}>
      <Txt v="t14m" color={error ? colores.error : colores.onSurfaceVariant} style={s.rotulo}>
        {rotulo}
      </Txt>
      {children ?? (
        <TextInput
          allowFontScaling
          accessibilityLabel={rotulo}
          accessibilityHint={error ?? ayuda}
          placeholderTextColor={colores.onSurfaceVariant}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[s.entrada, multiline && s.multi, !!error && s.entradaError]}
          {...rest}
        />
      )}
      {error ? (
        <View style={s.ayuda} accessibilityRole="alert">
          <MaterialCommunityIcons name="alert-circle" size={20} color={colores.error} />
          <Txt v="t14m" color={colores.error} style={s.ayudaTexto}>
            {error}
          </Txt>
        </View>
      ) : ayuda ? (
        <Txt v="t14" tenue style={s.ayudaSola}>
          {ayuda}
        </Txt>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  campo: { marginTop: 12 },
  rotulo: { marginBottom: 4 },
  entrada: {
    ...tipo.t16,
    minHeight: OBJETIVO_TACTIL,
    borderWidth: 1,
    borderColor: colores.outline,
    borderRadius: RADIO,
    backgroundColor: colores.surface,
    color: colores.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  multi: { minHeight: 96 },
  entradaError: {
    borderWidth: 2,
    borderColor: colores.error,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  ayuda: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 4 },
  ayudaTexto: { flex: 1 },
  ayudaSola: { marginTop: 4 },
});

export const estiloEntrada = s.entrada;
export const estiloEntradaError = s.entradaError;
