import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { FichaLista } from '../../components/FichaLista';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { ETIQUETA_MODULO, ETIQUETA_TIPO } from './etiquetas';
import type { PublicacionDto } from './tipos';

/** Cómo la verá el habitante: chips de tipo, título, ficha en orden fijo, imágenes. Solo lectura. */
export function VistaPublicacion({ p }: { p: PublicacionDto }) {
  return (
    <View>
      <View style={s.chips}>
        <View style={s.info}>
          <MaterialCommunityIcons name="tag-outline" size={20} color={colores.onPrimaryContainer} />
          <Txt v="t14m" color={colores.onPrimaryContainer}>
            {`${ETIQUETA_MODULO[p.modulo]} · ${ETIQUETA_TIPO[p.tipo]}`}
          </Txt>
        </View>
      </View>
      <Txt v="t24" style={s.titulo} accessibilityRole="header">
        {p.titulo}
      </Txt>
      {p.tipoVacuna && <Txt v="t14" tenue>{`Vacuna: ${p.tipoVacuna}`}</Txt>}
      {p.detalle && (
        <Txt v="t16" style={s.detalle}>
          {p.detalle}
        </Txt>
      )}
      <FichaLista ficha={p} />
      {!!p.imagenes?.length && (
        <View style={s.imagenes}>
          {p.imagenes.map((img, i) => (
            <Image
              key={img.id}
              source={{ uri: img.url }}
              style={s.foto}
              accessibilityLabel={`Imagen ${i + 1} de ${p.imagenes!.length}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Estado de una publicación del panel, con "Devuelta" derivado de las observaciones. */
export const ChipEstadoPublicacion = ({ p }: { p: PublicacionDto }) => (
  <EstadoChip estado={estadoVisual(p)} />
);

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: RADIO,
    backgroundColor: colores.primaryContainer,
  },
  titulo: { marginTop: 12, marginBottom: 4 },
  detalle: { marginTop: 8 },
  imagenes: { gap: 8, marginTop: 12 },
  foto: {
    width: '100%',
    height: 200,
    borderRadius: RADIO,
    backgroundColor: colores.primaryContainer,
  },
});
