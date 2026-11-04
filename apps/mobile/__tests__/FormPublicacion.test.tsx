import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import type { TipoPublicacion } from '@colpa/shared';
import { FormPublicacion } from '../features/publicaciones/FormPublicacion';
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
jest.mock('expo-image-picker', () => ({}));

const fetchMock = jest.fn();
const json = (status: number, cuerpo: unknown) =>
  Promise.resolve({
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(cuerpo)),
  });

async function montar(tipo: TipoPublicacion) {
  const ui = (t: TipoPublicacion) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } })
      }
    >
      <PaperProvider theme={tema}>
        <FormPublicacion tipo={t} />
      </PaperProvider>
    </QueryClientProvider>
  );
  const r = await render(ui(tipo));
  return { ...r, ui };
}

const llenar = async (campos: Record<string, string>) => {
  for (const [rotulo, v] of Object.entries(campos))
    await fireEvent.changeText(screen.getByLabelText(rotulo), v);
};
const COMPLETA = {
  Título: 'Comunicado',
  Fecha: '2026-11-15',
  Hora: '08:00',
  Lugar: 'Posta',
  'Público objetivo': 'Todos',
  Requisitos: 'Ninguno',
  Descripción: 'Detalle',
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it('no muestra errores antes de tocar un campo', async () => {
  await montar('COMUNICADO_SANITARIO');
  expect(screen.queryByText('Este campo es obligatorio')).toBeNull();
  await fireEvent(screen.getByLabelText('Lugar'), 'blur');
  await waitFor(() => expect(screen.getAllByText('Este campo es obligatorio')).toHaveLength(1));
});

it('el interruptor de destacado aparece solo en tipos destacables', async () => {
  const { rerender, ui } = await montar('COMUNICADO_SANITARIO');
  expect(screen.getByText('Destacar en Inicio')).toBeTruthy();
  await rerender(ui('CAMPANA_VACUNACION'));
  expect(screen.queryByText('Destacar en Inicio')).toBeNull();
});

it('al cambiar de tipo conserva los campos comunes y descarta los del tipo anterior', async () => {
  const { rerender, ui } = await montar('CAMPANA_VACUNACION');
  await llenar({ Título: 'Mi título', 'Tipo de vacuna': 'Polio' });
  await rerender(ui('COMUNICADO_SANITARIO'));
  await waitFor(() => expect(screen.getByLabelText('Título').props.value).toBe('Mi título'));
  expect(screen.queryByLabelText('Tipo de vacuna')).toBeNull();
});

it('reintentar "Enviar a revisión" tras fallar el envío no crea un segundo borrador', async () => {
  await montar('COMUNICADO_SANITARIO');
  await llenar(COMPLETA);
  const creada = {
    id: 'p1',
    estado: 'BORRADOR',
    destacado: false,
    ...COMPLETA,
    titulo: 'Comunicado',
  };
  fetchMock
    .mockReturnValueOnce(json(201, creada)) // POST crear
    .mockReturnValueOnce(json(500, { error: 'Falla' })) // POST enviar
    .mockReturnValue(json(200, { ...creada, estado: 'EN_REVISION' }));

  await fireEvent.press(screen.getByLabelText('Enviar a revisión'));
  await waitFor(() => expect(screen.getByText('Falla')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Enviar a revisión'));
  await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3));

  const llamadas = fetchMock.mock.calls.map(
    ([u, i]: [string, RequestInit]) => `${i.method} ${u.split('/api/v1')[1]}`,
  );
  expect(llamadas.filter((l) => l === 'POST /panel/publicaciones')).toHaveLength(1);
  expect(llamadas.filter((l) => l === 'POST /panel/publicaciones/p1/enviar')).toHaveLength(2);
});

it('onCreada se llama al crear el borrador (bloquea módulo/tipo en nueva.tsx)', async () => {
  const onCreada = jest.fn();
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <PaperProvider theme={tema}>
        <FormPublicacion tipo="COMUNICADO_SANITARIO" onCreada={onCreada} />
      </PaperProvider>
    </QueryClientProvider>,
  );
  await llenar(COMPLETA);
  fetchMock
    .mockReturnValueOnce(json(201, { id: 'p1', estado: 'BORRADOR', destacado: false, ...COMPLETA }))
    .mockReturnValue(json(500, { error: 'Falla' }));
  await fireEvent.press(screen.getByLabelText('Enviar a revisión'));
  await waitFor(() => expect(onCreada).toHaveBeenCalledTimes(1));
});
