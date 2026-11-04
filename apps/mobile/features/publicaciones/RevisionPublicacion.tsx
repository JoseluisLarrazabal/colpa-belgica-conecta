import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Accion } from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { momento } from '../../lib/fechas';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { useAccion } from './hooks';
import type { PublicacionDto } from './tipos';
import { VistaPublicacion } from './VistaPublicacion';

/** P-18: vista previa de solo lectura + decisión del Aprobador (Publicar / Devolver / Archivar). */
export function RevisionPublicacion({ p }: { p: PublicacionDto }) {
  const publicar = useAccion('PUBLICAR');
  const devolver = useAccion('DEVOLVER');
  const archivar = useAccion('ARCHIVAR');
  const [pidiendoObs, setPidiendoObs] = useState(false);
  const [obs, setObs] = useState('');
  const [errorObs, setErrorObs] = useState<string | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  async function correr(
    m: { mutateAsync: (a: { id: string; observaciones?: string }) => Promise<unknown> },
    a: Accion,
    extra?: string,
  ) {
    setErrorGeneral(null);
    try {
      await m.mutateAsync({ id: p.id, ...(a === 'DEVOLVER' && { observaciones: extra }) });
      router.replace('/(panel)/revision');
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.message : 'No se pudo completar la operación');
    }
  }

  const confirmarDevolver = () => {
    if (!obs.trim()) return setErrorObs('Escriba una observación para poder devolver.');
    setErrorObs(undefined);
    void correr(devolver, 'DEVOLVER', obs.trim());
  };

  const acciones =
    p.estado === 'EN_REVISION' ? (
      <>
        <Boton
          texto="Publicar"
          icono="check-circle-outline"
          onPress={() => void correr(publicar, 'PUBLICAR')}
          cargando={publicar.isPending}
        />
        <View style={s.nota}>
          <MaterialCommunityIcons name="bell-outline" size={20} color={colores.onSurfaceVariant} />
          <Txt v="t14" tenue style={s.notaTexto}>
            Se enviará una notificación a todos los dispositivos
          </Txt>
        </View>
        <Boton
          texto="Devolver con observaciones"
          variante="borde"
          onPress={pidiendoObs ? confirmarDevolver : () => setPidiendoObs(true)}
          cargando={devolver.isPending}
        />
      </>
    ) : p.estado === 'PUBLICADO' ? (
      <Boton
        texto="Archivar"
        variante="borde"
        icono="archive-outline"
        onPress={() => void correr(archivar, 'ARCHIVAR')}
        cargando={archivar.isPending}
      />
    ) : null;
  return (
    <Pantalla titulo="Revisar publicación" atras acciones={acciones}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.encabezado}>
          <EstadoChip estado={estadoVisual(p)} />
        </View>
        <View style={s.meta}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={colores.onSurfaceVariant} />
          <Txt v="t14">
            <Txt v="t14m">Última modificación: </Txt>
            {momento(p.actualizadoEn)}
          </Txt>
        </View>
        <View style={s.prev} accessibilityLabel="Vista previa, solo lectura">
          <View style={s.prevTop}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={colores.onSurfaceVariant}
            />
            <Txt v="t14m" tenue>
              Vista previa, así la verán los habitantes
            </Txt>
          </View>
          <VistaPublicacion p={p} />
        </View>
        {pidiendoObs && (
          <Campo
            rotulo="Observaciones para el Publicador (obligatorio)"
            placeholder="Escriba qué debe corregir"
            multiline
            value={obs}
            onChangeText={setObs}
            error={errorObs}
            autoFocus
          />
        )}
        {errorGeneral && (
          <View style={s.error} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-circle" size={24} color={colores.error} />
            <Txt v="t14m" style={s.notaTexto}>
              {errorGeneral}
            </Txt>
          </View>
        )}
      </ScrollView>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  encabezado: { marginTop: 12 },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  prev: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colores.outline,
    borderRadius: RADIO,
    backgroundColor: colores.surface,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  prevTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: colores.primaryContainer,
  },
  nota: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6, marginBottom: 10 },
  notaTexto: { flex: 1 },
  error: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.error,
    backgroundColor: colores.surface,
  },
});
