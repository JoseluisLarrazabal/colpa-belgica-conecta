import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fechaLarga, hora12 } from '../lib/fechas';
import { colores } from '../theme';
import { Txt } from './Txt';

export interface DatosFicha {
  fechaInicio: string | null;
  fechaFin?: string | null;
  hora: string | null;
  lugar: string | null;
  poblacionObjetivo: string | null;
  requisitos: string | null;
}

/** Orden fijo del diseño C: fecha, hora, lugar, público objetivo, requisitos. */
export function FichaLista({ ficha }: { ficha: DatosFicha }) {
  const fecha = ficha.fechaInicio
    ? ficha.fechaFin && ficha.fechaFin !== ficha.fechaInicio
      ? `${fechaLarga(ficha.fechaInicio)} al ${fechaLarga(ficha.fechaFin)}`
      : fechaLarga(ficha.fechaInicio)
    : null;
  const filas = [
    { icono: 'calendar', rotulo: 'Fecha', valor: fecha },
    { icono: 'clock-outline', rotulo: 'Hora', valor: ficha.hora && hora12(ficha.hora) },
    { icono: 'map-marker', rotulo: 'Lugar', valor: ficha.lugar },
    { icono: 'account-group', rotulo: 'Público objetivo', valor: ficha.poblacionObjetivo },
    { icono: 'format-list-bulleted', rotulo: 'Requisitos', valor: ficha.requisitos },
  ] as const;
  return (
    <View style={s.lista}>
      {filas.map((f, i) => (
        <View key={f.rotulo} style={[s.fila, i === 0 && s.primera]}>
          <MaterialCommunityIcons
            name={f.icono}
            size={24}
            color={colores.primary}
            style={s.icono}
          />
          <View style={s.texto}>
            <Txt v="t14m" tenue>
              {f.rotulo}
            </Txt>
            <Txt v="t16">{f.valor ?? 'Sin dato'}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  lista: { marginTop: 12 },
  fila: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colores.primaryContainer,
  },
  primera: { borderTopColor: colores.primary },
  icono: { marginTop: 2 },
  texto: { flex: 1 },
});
