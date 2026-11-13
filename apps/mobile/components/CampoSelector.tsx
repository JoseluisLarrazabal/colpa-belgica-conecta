import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { dateAFecha, dateAHora, fechaADate, fechaLarga, hora12, horaADate } from '../lib/fechas';
import { OBJETIVO_TACTIL, colores } from '../theme';
import { Campo, estiloEntrada, estiloEntradaError } from './Campo';
import { Txt } from './Txt';

interface Props {
  rotulo: string;
  modo: 'date' | 'time';
  /** Valor del formulario ('AAAA-MM-DD' o 'HH:MM'; '' = sin elegir). */
  valor: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  /** 'AAAA-MM-DD'; solo fechas. */
  minimo?: string;
  error?: string;
  ayuda?: string;
  /** Muestra "Quitar" cuando hay valor (campos opcionales). */
  quitarRotulo?: string;
}

/** Campo de fecha/hora con el diálogo nativo de Android; misma envoltura que `Campo`. */
export function CampoSelector({
  rotulo,
  modo,
  valor,
  onChange,
  onBlur,
  minimo,
  error,
  ayuda,
  quitarRotulo,
}: Props) {
  // shortcut: selector nativo solo en Android; iOS/web tipean el valor. Añadir el modal de iOS cuando se construya para iOS.
  if (Platform.OS !== 'android')
    return (
      <Campo
        rotulo={rotulo}
        value={valor}
        onChangeText={onChange}
        onBlur={onBlur}
        error={error}
        ayuda={ayuda}
        placeholder={modo === 'time' ? 'HH:MM' : 'AAAA-MM-DD'}
        keyboardType="numbers-and-punctuation"
      />
    );

  const esHora = modo === 'time';
  const texto = !valor
    ? ''
    : esHora
      ? hora12(valor)
      : `${fechaLarga(valor)} de ${valor.slice(0, 4)}`;
  const abrir = () =>
    DateTimePickerAndroid.open({
      mode: modo,
      value: valor ? (esHora ? horaADate : fechaADate)(valor) : new Date(),
      // Ruedas 12 h con a. m./p. m.; el valor del formulario sigue siendo 'HH:MM' (24 h).
      is24Hour: false,
      display: esHora ? 'spinner' : 'default',
      minimumDate: minimo ? fechaADate(minimo) : undefined,
      // Solo se llama al confirmar.
      onValueChange: (_e, d) => {
        onChange((esHora ? dateAHora : dateAFecha)(d));
        onBlur?.();
      },
    });

  return (
    <Campo rotulo={rotulo} error={error} ayuda={ayuda}>
      <View style={s.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${rotulo}: ${valor ? texto : 'sin elegir'}`}
          accessibilityHint={error ?? ayuda}
          onPress={abrir}
          style={[estiloEntrada, s.caja, !!error && estiloEntradaError]}
        >
          <Txt v="t16" color={valor ? colores.onSurface : colores.onSurfaceVariant} style={s.texto}>
            {valor ? texto : modo === 'date' ? 'Elegir fecha' : 'Elegir hora'}
          </Txt>
          <MaterialCommunityIcons
            name={modo === 'date' ? 'calendar' : 'clock-outline'}
            size={24}
            color={colores.onSurfaceVariant}
          />
        </Pressable>
        {quitarRotulo && valor ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={quitarRotulo}
            onPress={() => onChange('')}
            style={s.quitar}
          >
            <MaterialCommunityIcons name="close" size={24} color={colores.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>
    </Campo>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caja: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  texto: { flex: 1 },
  quitar: {
    width: OBJETIVO_TACTIL,
    height: OBJETIVO_TACTIL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
