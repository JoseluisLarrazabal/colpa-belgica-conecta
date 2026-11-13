import { Stack } from 'expo-router';
import { useSesion } from '../../lib/sesion';

/** Panel de funcionarios: sin sesión solo existe `login`; con sesión, todo menos `login`. */
export default function PanelLayout() {
  const { cargando, funcionario } = useSesion();
  if (cargando) return null;
  const dentro = !!funcionario;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!dentro}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={dentro}>
        <Stack.Screen name="inicio" />
        <Stack.Screen name="publicaciones/index" />
        <Stack.Screen name="publicaciones/nueva" />
        <Stack.Screen name="publicaciones/[id]" />
        <Stack.Screen name="revision/index" />
        <Stack.Screen name="revision/publicadas" />
        <Stack.Screen name="revision/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
