import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colores, tipo } from '../../theme';

/** Solo pestañas que funcionan hoy: Inicio y Salud. El detalle es una ruta oculta de la barra. */
export default function HabitanteLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primary,
        tabBarInactiveTintColor: colores.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: tipo.t14m.fontSize, fontWeight: tipo.t14m.fontWeight },
        tabBarStyle: { minHeight: 64, backgroundColor: colores.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={24} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="salud"
        options={{
          title: 'Salud',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="medical-bag" size={24} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
