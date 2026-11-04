import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Cargando, ErrorCarga } from '../../components/Estados';
import { Pantalla } from '../../components/Pantalla';
import { SelloActualizacion } from '../../components/SelloActualizacion';
import { Txt } from '../../components/Txt';
import { FilaPublica, TarjetaDestacada } from '../../features/publico/TarjetaPublica';
import { useDestacadas, useProximas } from '../../features/publico/hooks';
import { abrirPublicacion } from '../../features/publico/navegar';
import { SIN_RED_HABITANTE, masReciente } from '../../features/publico/texto';
import { useSesion } from '../../lib/sesion';
import { colores } from '../../theme';

/** P-01 Inicio (RF-16): comunicados destacados y próximas actividades. */
export default function Inicio() {
  const { funcionario } = useSesion();
  const destacadas = useDestacadas();
  const proximas = useProximas();
  const [manual, setManual] = useState(false);

  async function actualizar() {
    setManual(true);
    await Promise.allSettled([destacadas.refetch(), proximas.refetch()]);
    setManual(false);
  }

  // Una actividad tiene fecha; lo ya mostrado en Destacados no se repite.
  const actividades = proximas.data?.datos.filter((p) => p.fechaInicio && !p.destacado) ?? [];

  return (
    <Pantalla
      titulo="Colpa Bélgica Conecta"
      textoSinRed={SIN_RED_HABITANTE}
      derecha={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar contenido"
          onPress={() => void actualizar()}
          style={s.ib}
        >
          <MaterialCommunityIcons name="sync" size={24} color={colores.onSurface} />
        </Pressable>
      }
      banda={
        <SelloActualizacion
          fecha={masReciente(destacadas.data?.generadoEn, proximas.data?.generadoEn)}
        />
      }
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={manual} onRefresh={() => void actualizar()} />}
      >
        <Txt v="t22" style={s.seccion} accessibilityRole="header">
          Destacados
        </Txt>
        {destacadas.isPending ? (
          <Cargando />
        ) : destacadas.isError ? (
          <ErrorCarga
            mensaje={destacadas.error.message}
            onReintentar={() => void destacadas.refetch()}
          />
        ) : destacadas.data.datos.length ? (
          destacadas.data.datos.map((p) => (
            <TarjetaDestacada key={p.id} p={p} onAbrir={abrirPublicacion} />
          ))
        ) : (
          <Txt v="t16" tenue style={s.vacio}>
            No hay comunicados destacados por ahora.
          </Txt>
        )}

        <Txt v="t22" style={s.seccion} accessibilityRole="header">
          Próximas actividades
        </Txt>
        {proximas.isPending ? (
          <Cargando />
        ) : proximas.isError ? (
          <ErrorCarga
            mensaje={proximas.error.message}
            onReintentar={() => void proximas.refetch()}
          />
        ) : actividades.length ? (
          actividades.map((p) => <FilaPublica key={p.id} p={p} onAbrir={abrirPublicacion} />)
        ) : (
          <Txt v="t16" tenue style={s.vacio}>
            No hay actividades próximas por ahora.
          </Txt>
        )}

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(funcionario ? '/(panel)/inicio' : '/(panel)/login')}
          style={s.acceso}
        >
          <MaterialCommunityIcons name="lock-outline" size={20} color={colores.primary} />
          <Txt v="t14m" color={colores.primary} style={s.subrayado}>
            Acceso funcionarios
          </Txt>
        </Pressable>
      </ScrollView>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  ib: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  seccion: { marginTop: 20 },
  vacio: { marginTop: 8 },
  acceso: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 24 },
  subrayado: { textDecorationLine: 'underline' },
});
