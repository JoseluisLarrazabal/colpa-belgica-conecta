import { MODULOS } from '@colpa/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSesion } from '../../lib/sesion';
import { Txt } from '../../components/Txt';
import { colores } from '../../theme';

export default function Inicio() {
  const { colors } = useTheme();
  const { funcionario } = useSesion();
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.background }}
    >
      <Text variant="headlineMedium">Colpa Bélgica Conecta</Text>
      <Text variant="bodyLarge">Módulos: {MODULOS.join(', ')}</Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  acceso: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 16 },
  subrayado: { textDecorationLine: 'underline' },
});
