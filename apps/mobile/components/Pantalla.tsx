import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../theme';
import { BannerSinConexion } from './BannerSinConexion';
import { Txt } from './Txt';

interface Props {
  titulo: string;
  /** Muestra la flecha de volver. */
  atras?: boolean;
  derecha?: ReactNode;
  /** Bandas bajo la barra (sello, banner sin conexión). */
  banda?: ReactNode;
  /** Barra de acciones fija abajo. */
  acciones?: ReactNode;
  /** Texto del banner sin conexión (por defecto, el del panel). */
  textoSinRed?: string;
  children: ReactNode;
}

/** Marco de pantalla del diseño C: barra superior 56 dp, contenido, acciones fijas. */
export function Pantalla({
  titulo,
  atras,
  derecha,
  banda,
  acciones,
  textoSinRed,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const red = useNetworkState();
  const sinRed = red.isConnected === false || red.isInternetReachable === false;
  return (
    <View style={[s.raiz, { paddingTop: insets.top }]}>
      <View style={s.barra}>
        {atras && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={s.ib}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colores.onSurface} />
          </Pressable>
        )}
        <Txt v="t22" style={[s.titulo, !atras && s.tituloSolo]} accessibilityRole="header">
          {titulo}
        </Txt>
        {derecha}
      </View>
      {sinRed && <BannerSinConexion texto={textoSinRed} />}
      {banda}
      <View style={s.cuerpo}>{children}</View>
      {acciones && (
        <View style={[s.acciones, { paddingBottom: 12 + insets.bottom }]}>{acciones}</View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.background },
  barra: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: colores.surface,
    borderBottomWidth: 1,
    borderBottomColor: colores.primaryContainer,
  },
  ib: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1 },
  tituloSolo: { paddingLeft: 12 },
  cuerpo: { flex: 1 },
  acciones: {
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: colores.surface,
    borderTopWidth: 1,
    borderTopColor: colores.primaryContainer,
  },
});
