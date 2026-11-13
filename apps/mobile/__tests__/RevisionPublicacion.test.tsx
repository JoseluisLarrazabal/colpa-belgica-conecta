import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { RevisionPublicacion } from '../features/publicaciones/RevisionPublicacion';
import type { PublicacionDto } from '../features/publicaciones/tipos';
import { tema } from '../theme';

jest.mock('expo-router', () => ({
  router: { dismissTo: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const pub = (extra: Partial<PublicacionDto> = {}): PublicacionDto => ({
  id: 'p1',
  modulo: 'SALUD',
  tipo: 'COMUNICADO_SANITARIO',
  titulo: 'Comunicado',
  detalle: null,
  fechaInicio: null,
  fechaFin: null,
  hora: null,
  lugar: null,
  poblacionObjetivo: null,
  requisitos: null,
  tipoVacuna: null,
  destacado: false,
  estado: 'EN_REVISION',
  observaciones: null,
  unidadId: 'u1',
  autorId: 'a1',
  publicadoEn: null,
  actualizadoEn: '2026-11-01T10:00:00.000Z',
  ...extra,
});

const montar = (p: PublicacionDto) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaperProvider theme={tema}>
        <RevisionPublicacion p={p} />
      </PaperProvider>
    </QueryClientProvider>,
  );

it('no promete notificación push: dice dónde aparecerá al publicar', async () => {
  await montar(pub());
  expect(
    screen.getByText('Al publicar, aparecerá para los habitantes en Inicio y en Salud'),
  ).toBeTruthy();
  expect(screen.queryByText(/notificaci/i)).toBeNull();
});

it('muestra "Destacado en Inicio" solo si la publicación es destacada', async () => {
  const { unmount } = await montar(pub({ destacado: true }));
  expect(screen.getByText('Destacado en Inicio')).toBeTruthy();
  await unmount();
  await montar(pub());
  expect(screen.queryByText('Destacado en Inicio')).toBeNull();
});

describe('RF-09 archivar publicación', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
    fetchMock.mockReset().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  const publicada = () => montar(pub({ estado: 'PUBLICADO' }));
  const aviso = 'Los habitantes dejarán de ver esta publicación. No se puede deshacer.';

  it('RF-09: tocar "Archivar" pide confirmación y no llama a la API', async () => {
    await publicada();
    await fireEvent.press(screen.getByText('Archivar'));
    expect(screen.getByText(aviso)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('RF-09: "Cancelar" quita el aviso', async () => {
    await publicada();
    await fireEvent.press(screen.getByText('Archivar'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(screen.queryByText(aviso)).toBeNull();
    expect(screen.getByText('Archivar')).toBeTruthy();
  });

  it('RF-09: "Confirmar archivo" llama a POST archivar una vez', async () => {
    await publicada();
    await fireEvent.press(screen.getByText('Archivar'));
    await fireEvent.press(screen.getByText('Confirmar archivo'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/panel\/publicaciones\/p1\/archivar$/);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });
});
