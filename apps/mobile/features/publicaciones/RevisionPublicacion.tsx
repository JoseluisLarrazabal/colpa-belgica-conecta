import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Accion } from '@colpa/shared';
import { ApiError } from '../../lib/api';
import { momento } from '../../lib/fechas';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { ChipElegir } from '../../components/ChipElegir';
import { EstadoChip, estadoVisual } from '../../components/EstadoChip';
import { CajaError } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { RADIO, colores } from '../../theme';
import { ETIQUETA_MODULO } from './etiquetas';
import { useAccion } from './hooks';
import type { PublicacionDto } from './tipos';
import { VistaPublicacion } from './VistaPublicacion';

const MAX_OBS = 2000; // devolverSchema

/** P-18: vista previa de solo lectura + decisión del Aprobador (Publicar / Devolver / Archivar). */
export function RevisionPublicacion({ p }: { p: PublicacionDto }) {
  const publicar = useAccion('PUBLICAR');
  const devolver = useAccion('DEVOLVER');
  const archivar = useAccion('ARCHIVAR');
  const ocupado = publicar.isPending || devolver.isPending || archivar.isPending;
  const [pidiendoObs, setPidiendoObs] = useState(false);
  const [confirmandoArchivo, setConfirmandoArchivo] = useState(false);
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
      router.dismissTo(a === 'ARCHIVAR' ? '/(panel)/revision/publicadas' : '/(panel)/revision');
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
          deshabilitado={ocupado}
        />
        <View style={s.nota}>
          <MaterialCommunityIcons name="eye-outline" size={20} color={colores.onSurfaceVariant} />
          <Txt v="t14" tenue style={s.notaTexto}>
            {`Al publicar, aparecerá para los habitantes en Inicio y en ${ETIQUETA_MODULO[p.modulo]}`}
          </Txt>
        </View>
        <Boton
          texto="Devolver con observaciones"
          variante="borde"
          onPress={pidiendoObs ? confirmarDevolver : () => setPidiendoObs(true)}
          cargando={devolver.isPending}
          deshabilitado={ocupado}
        />
      </>
    ) : p.estado === 'PUBLICADO' ? (
      confirmandoArchivo ? (
        <>
          <View style={s.nota} accessibilityRole="alert">
            <MaterialCommunityIcons name="alert-outline" size={20} color={colores.warning} />
            <Txt v="t14" style={s.notaTexto}>
              Los habitantes dejarán de ver esta publicación. No se puede deshacer.
            </Txt>
          </View>
          <Boton
            texto="Confirmar archivo"
            icono="archive-outline"
            onPress={() => void correr(archivar, 'ARCHIVAR')}
            cargando={archivar.isPending}
            deshabilitado={ocupado}
          />
          <Boton
            texto="Cancelar"
            variante="borde"
            onPress={() => setConfirmandoArchivo(false)}
            deshabilitado={ocupado}
          />
        </>
      ) : (
        <Boton
          texto="Archivar"
          variante="borde"
          icono="archive-outline"
          onPress={() => setConfirmandoArchivo(true)}
        />
      )
    ) : null;
  return (
    <Pantalla
      titulo={p.estado === 'PUBLICADO' ? 'Publicación publicada' : 'Revisar publicación'}
      atras
      acciones={acciones}
    >
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
        {p.destacado && (
          <View style={s.destacado}>
            <ChipElegir texto="Destacado en Inicio" activo />
          </View>
        )}
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
            maxLength={MAX_OBS}
            ayuda={`${obs.length}/${MAX_OBS}`}
            value={obs}
            onChangeText={setObs}
            error={errorObs}
            autoFocus
          />
        )}
        {errorGeneral && <CajaError mensaje={errorGeneral} />}
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
  destacado: { marginTop: 12, alignSelf: 'flex-start' },
  nota: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6, marginBottom: 10 },
  notaTexto: { flex: 1 },
});
