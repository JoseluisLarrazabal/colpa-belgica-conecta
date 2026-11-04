import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Estado } from '@colpa/shared';
import { RADIO, colores } from '../theme';
import { Txt } from './Txt';

/** "Devuelta" no es un estado de la API: es un Borrador con observaciones del Aprobador. */
export type EstadoVisual = Estado | 'DEVUELTA' | 'SIN_CONEXION';

export const estadoVisual = (p: { estado: Estado; observaciones?: string | null }): EstadoVisual =>
  p.estado === 'BORRADOR' && p.observaciones ? 'DEVUELTA' : p.estado;

type Icono = keyof typeof MaterialCommunityIcons.glyphMap;
interface Def {
  texto: string;
  icono: Icono;
  colorIcono: string;
  borde: string;
  fondo: string;
  colorTexto: string;
}
const base = { fondo: colores.surface, colorTexto: colores.onSurface };
const DEF: Record<EstadoVisual, Def> = {
  BORRADOR: {
    ...base,
    texto: 'Borrador',
    icono: 'pencil-outline',
    colorIcono: colores.onSurfaceVariant,
    borde: colores.outline,
  },
  EN_REVISION: {
    texto: 'En revisión',
    icono: 'clock-outline',
    colorIcono: colores.onPrimaryContainer,
    borde: colores.primaryContainer,
    fondo: colores.primaryContainer,
    colorTexto: colores.onPrimaryContainer,
  },
  DEVUELTA: {
    ...base,
    texto: 'Devuelta',
    icono: 'alert-outline',
    colorIcono: colores.warning,
    borde: colores.warning,
  },
  PUBLICADO: {
    ...base,
    texto: 'Publicada',
    icono: 'check-circle',
    colorIcono: colores.success,
    borde: colores.success,
  },
  ARCHIVADO: {
    ...base,
    texto: 'Archivada',
    icono: 'archive-outline',
    colorIcono: colores.onSurfaceVariant,
    borde: colores.outline,
  },
  SIN_CONEXION: {
    texto: 'Sin conexión',
    icono: 'wifi-off',
    colorIcono: '#FFFFFF',
    borde: colores.onSurfaceVariant,
    fondo: colores.onSurfaceVariant,
    colorTexto: '#FFFFFF',
  },
};

/** Estado = icono + texto (nunca solo color). */
export function EstadoChip({ estado }: { estado: EstadoVisual }) {
  const d = DEF[estado];
  return (
    <View
      accessible
      accessibilityLabel={`Estado: ${d.texto}`}
      style={[s.chip, { borderColor: d.borde, backgroundColor: d.fondo }]}
    >
      <MaterialCommunityIcons name={d.icono} size={20} color={d.colorIcono} />
      <Txt v="t14m" color={d.colorTexto}>
        {d.texto}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 32,
    paddingVertical: 2,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: RADIO,
    borderWidth: 1,
  },
});
