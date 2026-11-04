import '../lib/zod-es';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProveedorSesion } from '../lib/sesion';
import { tema } from '../theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={tema}>
          <ProveedorSesion>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </ProveedorSesion>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
