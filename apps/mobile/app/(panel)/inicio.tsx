import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSesion } from '../../lib/sesion';
import { Boton } from '../../components/Boton';
import { Pantalla } from '../../components/Pantalla';
import { Txt } from '../../components/Txt';
import { ETIQUETA_ROL } from '../../features/cuentas/etiquetas';
import { usePublicaciones } from '../../features/publicaciones/hooks';
import { RADIO, colores } from '../../theme';

/** Inicio del panel: lo que cada rol necesita primero. */
export default function InicioPanel() {
  const { funcionario, salir } = useSesion();
  const rol = funcionario?.rol;
  return (
    <Pantalla
      titulo="Panel"
      derecha={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          onPress={() => {
            void salir().then(() => router.replace('/'));
          }}
          style={s.ib}
        >
          <MaterialCommunityIcons name="logout" size={24} color={colores.onSurface} />
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Txt v="t24" accessibilityRole="header">{`Hola, ${funcionario?.nombreCompleto ?? ''}`}</Txt>
        <Txt v="t14" tenue>
          {rol ? ETIQUETA_ROL[rol] : ''}
        </Txt>
        {rol === 'PUBLICADOR' && <PanelPublicador />}
        {rol === 'APROBADOR' && <PanelAprobador />}
        {rol === 'ADMIN_TECNICO' && <PanelAdmin />}
      </ScrollView>
    </Pantalla>
  );
}

function PanelAdmin() {
  return (
    <View style={s.bloque}>
      <Boton
        texto="Cuentas de funcionarios"
        icono="account-multiple-outline"
        onPress={() => router.push('/(panel)/cuentas')}
      />
      <Boton
        texto="Auditoría"
        variante="borde"
        icono="history"
        onPress={() => router.push('/(panel)/auditoria')}
      />
    </View>
  );
}

function PanelPublicador() {
  const borradores = usePublicaciones('BORRADOR');
  const devueltas = borradores.data?.filter((p) => !!p.observaciones).length ?? 0;
  return (
    <View style={s.bloque}>
      {devueltas > 0 && (
        <View style={[s.tarjeta, s.aviso]} accessibilityRole="alert">
          <MaterialCommunityIcons name="alert-outline" size={24} color={colores.warning} />
          <Txt v="t16m" style={s.tarjetaTexto}>
            {devueltas === 1
              ? '1 publicación devuelta para corregir'
              : `${devueltas} publicaciones devueltas para corregir`}
          </Txt>
        </View>
      )}
      <Boton
        texto="Nueva publicación"
        icono="plus"
        onPress={() => router.push('/(panel)/publicaciones/nueva')}
      />
      <Boton
        texto="Mis publicaciones"
        variante="borde"
        icono="format-list-bulleted"
        onPress={() => router.push('/(panel)/publicaciones')}
      />
    </View>
  );
}

function PanelAprobador() {
  const cola = usePublicaciones('EN_REVISION');
  const n = cola.data?.length;
  return (
    <View style={s.bloque}>
      <View style={s.tarjeta}>
        <MaterialCommunityIcons name="clock-outline" size={24} color={colores.primary} />
        <Txt v="t16m" style={s.tarjetaTexto}>
          {n === undefined
            ? 'Cola de revisión'
            : n === 0
              ? 'No hay publicaciones esperando revisión'
              : n === 1
                ? '1 publicación espera su revisión'
                : `${n} publicaciones esperan su revisión`}
        </Txt>
      </View>
      <Boton
        texto="Revisar publicaciones"
        icono="clipboard-check-outline"
        onPress={() => router.push('/(panel)/revision')}
      />
      <Boton
        texto="Publicadas"
        variante="borde"
        icono="archive-outline"
        onPress={() => router.push('/(panel)/revision/publicadas')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16 },
  ib: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bloque: { marginTop: 24, gap: 12 },
  tarjeta: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 48,
    marginTop: 24,
    padding: 12,
    borderRadius: RADIO,
    borderWidth: 1,
    borderColor: colores.primaryContainer,
    backgroundColor: colores.surface,
  },
  aviso: { marginTop: 0, borderColor: colores.warning },
  tarjetaTexto: { flex: 1 },
});
