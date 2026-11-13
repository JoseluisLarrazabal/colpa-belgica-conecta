import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Modulo, PublicacionPublicaDto } from '@colpa/shared';
import { Txt } from '../../components/Txt';
import { fechaLarga, fechaRelativa, hora12 } from '../../lib/fechas';
import { RADIO, colores } from '../../theme';
import { ETIQUETA_MODULO, ETIQUETA_TIPO } from '../publicaciones/etiquetas';

type Icono = keyof typeof MaterialCommunityIcons.glyphMap;
const ICONO_MODULO: Record<Modulo, Icono> = {
  SALUD: 'medical-bag',
  EDUCACION: 'school-outline',
  EVENTOS: 'calendar-star',
};

interface Props {
  p: PublicacionPublicaDto;
  onAbrir: (p: PublicacionPublicaDto) => void;
  ahora?: Date;
}

const cuando = (p: PublicacionPublicaDto, ahora?: Date) =>
  [
    p.fechaInicio && fechaRelativa(p.fechaInicio, ahora, p.fechaFin),
    p.hora && hora12(p.hora),
    p.lugar,
  ]
    .filter(Boolean)
    .join(' · ');

/** Fila de lista (Próximas actividades y lista de Salud): icono de módulo, título, cuándo/dónde. */
export const FilaPublica = memo(function FilaPublica({ p, onAbrir, ahora }: Props) {
  const sub = cuando(p, ahora);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.titulo}. ${ETIQUETA_MODULO[p.modulo]}, ${ETIQUETA_TIPO[p.tipo]}${sub ? `. ${sub}` : ''}`}
      onPress={() => onAbrir(p)}
      style={s.fila}
    >
      <View style={s.tile}>
        <MaterialCommunityIcons
          name={ICONO_MODULO[p.modulo]}
          size={24}
          color={colores.onPrimaryContainer}
        />
      </View>
      <View style={s.texto}>
        <Txt v="t16m" numberOfLines={2}>
          {p.titulo}
        </Txt>
        <Txt v="t14" tenue numberOfLines={2}>
          {`${sub ? `${sub} · ` : ''}${ETIQUETA_TIPO[p.tipo]}`}
        </Txt>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colores.onSurfaceVariant} />
    </Pressable>
  );
});

/** Tarjeta destacada (RF-16): imagen si hay, chips "Destacado" + módulo, título y fecha. */
export const TarjetaDestacada = memo(function TarjetaDestacada({ p, onAbrir }: Props) {
  const sub = [p.fechaInicio && fechaLarga(p.fechaInicio), p.lugar].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Destacado. ${p.titulo}. ${ETIQUETA_MODULO[p.modulo]}${sub ? `. ${sub}` : ''}`}
      onPress={() => onAbrir(p)}
      style={s.dest}
    >
      {p.imagenes[0] ? (
        <Image source={{ uri: p.imagenes[0] }} style={s.foto} accessible={false} />
      ) : (
        <View style={[s.foto, s.sinFoto]}>
          <MaterialCommunityIcons name={ICONO_MODULO[p.modulo]} size={48} color={colores.primary} />
        </View>
      )}
      <View style={s.cuerpo}>
        <View style={s.chips}>
          <View style={[s.chip, s.chipDest]}>
            <MaterialCommunityIcons name="star" size={20} color={colores.onPrimary} />
            <Txt v="t14m" color={colores.onPrimary}>
              Destacado
            </Txt>
          </View>
          <View style={[s.chip, s.chipInfo]}>
            <Txt v="t14m" color={colores.onPrimaryContainer}>
              {ETIQUETA_MODULO[p.modulo]}
            </Txt>
          </View>
        </View>
        <Txt v="t16m" numberOfLines={3}>
          {p.titulo}
        </Txt>
        {!!sub && (
          <Txt v="t14" tenue numberOfLines={2}>
            {sub}
          </Txt>
        )}
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colores.primaryContainer,
  },
  tile: {
    width: 48,
    height: 48,
    borderRadius: RADIO,
    backgroundColor: colores.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: 2 },
  dest: {
    marginTop: 12,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.primaryContainer,
    backgroundColor: colores.surface,
    overflow: 'hidden',
  },
  foto: { width: '100%', height: 140, backgroundColor: colores.primaryContainer },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: 12, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: RADIO,
  },
  chipDest: { backgroundColor: colores.primary },
  chipInfo: { backgroundColor: colores.primaryContainer },
});
