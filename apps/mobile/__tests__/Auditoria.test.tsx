import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import Auditoria from '../app/(panel)/auditoria';
import { tema } from '../theme';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const fetchMock = jest.fn();
const json = (cuerpo: unknown) =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(cuerpo)) });
const REGISTRO = {
  id: 'r1',
  accion: 'PUBLICAR',
  entidadId: 'p1',
  estadoResultante: 'PUBLICADO',
  detalle: null,
  fecha: '2026-11-01T10:00:00.000Z',
  funcionario: { id: 'f1', nombreCompleto: 'Ana Rojas', identificadorCuenta: 'ana' },
  publicacionTitulo: 'Campaña de vacunación',
};
const montar = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PaperProvider theme={tema}>
        <Auditoria />
      </PaperProvider>
    </QueryClientProvider>,
  );
const urls = () => fetchMock.mock.calls.map(([u]) => String(u));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('RF-10 Consultar auditoría', () => {
  it('pinta título, acción en palabras y funcionario', async () => {
    fetchMock.mockImplementation(() => json({ registros: [REGISTRO] }));
    await montar();
    expect(await screen.findByText('Campaña de vacunación')).toBeTruthy();
    expect(screen.getByText('Publicó · Ana Rojas')).toBeTruthy();
  });

  it('tocar un chip de acción vuelve a pedir con accion=…', async () => {
    fetchMock.mockImplementation(() => json({ registros: [REGISTRO] }));
    await montar();
    await screen.findByText('Campaña de vacunación');
    await fireEvent.press(screen.getByText('Archivó'));
    await waitFor(() => expect(urls().some((u) => u.includes('accion=ARCHIVAR'))).toBe(true));
  });

  it('lista vacía muestra el mensaje del servidor', async () => {
    fetchMock.mockImplementation(() =>
      json({ registros: [], mensaje: 'No existen registros para el criterio indicado' }),
    );
    await montar();
    expect(await screen.findByText('No existen registros para el criterio indicado')).toBeTruthy();
  });
});
