import { MODULOS } from '@colpa/shared';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function Inicio() {
  const { colors } = useTheme();
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.background }}
    >
      <Text variant="headlineMedium">Colpa Bélgica Conecta</Text>
      <Text variant="bodyLarge">Módulos: {MODULOS.join(', ')}</Text>
    </View>
  );
}
