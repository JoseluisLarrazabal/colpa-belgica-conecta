import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import type { PublicacionPublicaDto } from '@colpa/shared';
import Inicio from '../app/(habitante)/index';
import Salud from '../app/(habitante)/salud';
import { api } from '../lib/api';
import { tema } from '../theme';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../lib/sesion', () => ({ useSesion: () => ({ funcionario: null }) }));
jest.mock('../lib/api', () => ({ api: jest.fn() }));
const apiMock = jest.mocked(api);

const pub = (extra: Partial<PublicacionPublicaDto> = {}): PublicacionPublicaDto => ({
  id: 'p1',
  modulo: 'SALUD',
  tipo: 'COMUNICADO_SANITARIO',
  titulo: 'Comunicado de prueba',
  detalle: null,
  fechaInicio: null,
  fechaFin: null,
  hora: null,
  lugar: null,
  poblacionObjetivo: null,
  requisitos: null,
  tipoVacuna: null,
  unidadEducativa: null,
  destacado: false,
  unidad: 'Unidad de Salud',
  imagenes: [],
  publicadoEn: '2026-11-01T10:00:00.000Z',
  actualizadoEn: '2026-11-01T10:00:00.000Z',
  ...extra,
});
const lista = (datos: PublicacionPublicaDto[]) => ({
  datos,
  generadoEn: '2026-11-04T12:00:00.000Z',
});

const montar = async (ui: React.ReactElement) =>
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PaperProvider theme={tema}>{ui}</PaperProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RF-16 Inicio muestra destacados', () => {
  it('lista destacados y próximas actividades, con sello de actualización', async () => {
    const manana = new Date(Date.now() - 4 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
    apiMock.mockImplementation(async (ruta: string) =>
      ruta === '/publicaciones/destacadas'
        ? lista([pub({ id: 'd1', titulo: 'Campaña destacada', destacado: true })])
        : lista([pub({ id: 'a1', titulo: 'Atención móvil', fechaInicio: manana, hora: '09:00' })]),
    );
    await montar(<Inicio />);
    expect(await screen.findByText('Campaña destacada')).toBeTruthy();
    expect(await screen.findByText('Atención móvil')).toBeTruthy();
    expect(screen.getByText(/Mañana · 09:00/)).toBeTruthy();
    expect(screen.getByText(/Actualizado/)).toBeTruthy();
    expect(screen.getByText('Acceso funcionarios')).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith('/publicaciones/destacadas', { autenticado: false });
  });

  it('abre el detalle al tocar una tarjeta', async () => {
    apiMock.mockResolvedValue(lista([pub({ id: 'd1', titulo: 'Campaña destacada' })]));
    await montar(<Inicio />);
    fireEvent.press(await screen.findByLabelText(/Destacado\. Campaña destacada/));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/publicacion/[id]',
      params: { id: 'd1' },
    });
  });

  it('estado vacío en ambas secciones', async () => {
    apiMock.mockResolvedValue(lista([]));
    await montar(<Inicio />);
    expect(await screen.findByText('No hay comunicados destacados por ahora.')).toBeTruthy();
    expect(screen.getByText('No hay actividades próximas por ahora.')).toBeTruthy();
  });

  it('error de carga con reintento', async () => {
    apiMock.mockRejectedValue(new Error('No hay conexión con el servidor'));
    await montar(<Inicio />);
    const reintentos = await screen.findAllByLabelText('Reintentar');
    expect(reintentos).toHaveLength(2);
    apiMock.mockResolvedValue(lista([]));
    fireEvent.press(reintentos[0]!);
    await waitFor(() =>
      expect(screen.getByText('No hay comunicados destacados por ahora.')).toBeTruthy(),
    );
  });
});

describe('RF-15 Lista de Salud', () => {
  it('pide el módulo SALUD y muestra las tarjetas', async () => {
    apiMock.mockResolvedValue(
      lista([pub({ id: 's1', titulo: 'Vacunación infantil', tipo: 'CAMPANA_VACUNACION' })]),
    );
    await montar(<Salud />);
    expect(await screen.findByText('Vacunación infantil')).toBeTruthy();
    expect(apiMock).toHaveBeenCalledWith('/publicaciones?modulo=SALUD', { autenticado: false });
    expect(screen.getByText(/Actualizado/)).toBeTruthy();
  });

  it('estado vacío', async () => {
    apiMock.mockResolvedValue(lista([]));
    await montar(<Salud />);
    expect(await screen.findByText('No hay publicaciones de salud por ahora.')).toBeTruthy();
  });

  it('estado de error', async () => {
    apiMock.mockRejectedValue(new Error('Error inesperado'));
    await montar(<Salud />);
    expect(await screen.findByText('No se pudo cargar')).toBeTruthy();
    expect(screen.getByText('Error inesperado')).toBeTruthy();
  });
});
