import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FichaLista } from '../../components/FichaLista';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { ETIQUETA_MODULO, ETIQUETA_TIPO } from './etiquetas';
import type { ImagenDto, PublicacionDto } from './tipos';

/** Lo que se muestra al habitante: sirve a la ficha del panel y al DTO público (que añade `unidad`). */
export type DatosVista = Pick<
  PublicacionDto,
  | 'modulo'
  | 'tipo'
  | 'titulo'
  | 'detalle'
  | 'tipoVacuna'
  | 'fechaInicio'
  | 'fechaFin'
  | 'hora'
  | 'lugar'
  | 'poblacionObjetivo'
  | 'requisitos'
> & { imagenes?: Pick<ImagenDto, 'id' | 'url'>[]; unidad?: string };

/** Cómo la verá el habitante: chips de tipo, título, ficha en orden fijo, imágenes. Solo lectura. */
export function VistaPublicacion({ p }: { p: DatosVista }) {
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
      {p.unidad && <Txt v="t14" tenue>{`Emitido por ${p.unidad}`}</Txt>}
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
