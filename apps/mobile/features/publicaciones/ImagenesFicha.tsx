import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { MAX_IMAGENES } from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { eliminarImagen, pedirFirma, registrarImagen, subirACloudinary } from './imagenes';
import type { ImagenDto } from './tipos';

interface Props {
  /** undefined mientras la publicación aún no existe en el servidor. */
  publicacionId?: string;
  imagenes: ImagenDto[];
  /** Devuelve el id de la ficha (creando el borrador si hace falta) o null si la ficha no es válida. */
  asegurarBorrador?: () => Promise<string | null>;
  /** Se llama con el id si el borrador se creó al añadir (tras subir o cancelar la galería). */
  onBorradorCreado?: (id: string) => void;
}

/** RF-05: añade imágenes con subida firmada directa a Cloudinary y registro en la API. */
export function ImagenesFicha({
  publicacionId,
  imagenes,
  asegurarBorrador,
  onBorradorCreado,
}: Props) {
  const qc = useQueryClient();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinCloudinary, setSinCloudinary] = useState(false);
  const lleno = imagenes.length >= MAX_IMAGENES;

  const refrescar = (id: string) => qc.invalidateQueries({ queryKey: ['publicacion', id] });

  async function anadir() {
    setOcupado(true);
    setAviso(null);
    try {
      const id = publicacionId ?? (await asegurarBorrador?.());
      if (!id) {
        setAviso('Complete los campos marcados para poder añadir imágenes.');
        return;
      }
      const nuevo = !publicacionId;
      // Se firma antes de elegir: si el servidor no tiene Cloudinary, se sabe sin molestar a la persona.
      const firma = await pedirFirma(id);
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (r.canceled || !r.assets[0]) {
        if (nuevo) onBorradorCreado?.(id);
        return;
      }
      const subida = await subirACloudinary(firma, r.assets[0]);
      await registrarImagen(id, subida);
      await refrescar(id);
      if (nuevo) onBorradorCreado?.(id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) setSinCloudinary(true);
      else setAviso(e instanceof Error ? e.message : 'No se pudo añadir la imagen');
    } finally {
      setOcupado(false);
    }
  }

  async function quitar(img: ImagenDto) {
    if (!publicacionId) return;
    try {
      await eliminarImagen(publicacionId, img.id);
      await refrescar(publicacionId);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo quitar la imagen');
    }
  }

  const bloqueado = (!publicacionId && !asegurarBorrador) || sinCloudinary || lleno;
  const motivo = sinCloudinary
    ? 'La carga de imágenes no está configurada en el servidor.'
    : lleno
      ? `Ya tiene el máximo de ${MAX_IMAGENES} imágenes.`
      : !publicacionId
        ? asegurarBorrador
          ? 'Al añadir una imagen, la ficha se guarda como borrador.'
          : 'Guarde el borrador para poder añadir imágenes.'
        : null;

  return (
    <View>
      <Txt v="t14m" tenue style={s.rotulo}>
        {`Imágenes (${imagenes.length} de ${MAX_IMAGENES})`}
      </Txt>
      <View style={s.miniaturas}>
        {imagenes.map((img, i) => (
          <View key={img.id} style={s.mini}>
            <Image
              source={{ uri: img.url }}
              style={s.foto}
              accessibilityLabel={`Imagen ${i + 1}`}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar imagen ${i + 1}`}
              onPress={() => void quitar(img)}
              style={s.quitar}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={16} color={colores.onPrimary} />
            </Pressable>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir imagen"
          accessibilityState={{ disabled: bloqueado || ocupado }}
          disabled={bloqueado || ocupado}
          onPress={() => void anadir()}
          style={[s.mini, s.anadir, (bloqueado || ocupado) && s.off]}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colores.primary} />
          <Txt v="t14m" color={colores.primary}>
            {ocupado ? 'Subiendo' : 'Añadir'}
          </Txt>
        </Pressable>
      </View>
      {(motivo ?? aviso) && (
        <View style={s.aviso} accessibilityRole={aviso ? 'alert' : undefined}>
          <MaterialCommunityIcons
            name={aviso ? 'alert-circle' : 'information-outline'}
            size={20}
            color={aviso ? colores.error : colores.onSurfaceVariant}
          />
          <Txt
            v="t14"
            color={aviso ? colores.error : colores.onSurfaceVariant}
            style={s.avisoTexto}
          >
            {aviso ?? motivo}
          </Txt>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  rotulo: { marginTop: 16, marginBottom: 8 },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mini: { width: 72, height: 72, borderRadius: RADIO },
  foto: { width: 72, height: 72, borderRadius: RADIO, backgroundColor: colores.primaryContainer },
  quitar: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colores.onSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anadir: {
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colores.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.5 },
  aviso: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 8 },
  avisoTexto: { flex: 1 },
});
