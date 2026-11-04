import { Tabs } from 'expo-router';

export default function HabitanteLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
    </Tabs>
  );
}
