import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import type { PublicacionPublicaDto } from '@colpa/shared';
import Inicio from '../app/(habitante)/index';
import Salud from '../app/(habitante)/salud';
import Detalle from '../app/publicacion/[id]';
import { masAntiguo } from '../features/publico/texto';
import { api } from '../lib/api';
import { tema } from '../theme';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), canGoBack: jest.fn() },
    useLocalSearchParams: () => mockParams,
    Redirect: ({ href }: { href: string }) => <Text>{`redirige:${href}`}</Text>,
  };
});
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
  mockParams = {};
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
    expect(screen.getByText(/Mañana · 9:00 a. m./)).toBeTruthy();
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

describe('RF-16 Inicio: destacadas fuera del bloque Destacados', () => {
  it('una publicación destacada que /destacadas no devolvió sigue en Próximas', async () => {
    const manana = new Date(Date.now() - 4 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
    apiMock.mockImplementation(async (ruta: string) =>
      ruta === '/publicaciones/destacadas'
        ? lista([])
        : lista([
            pub({ id: 'x1', titulo: 'Feria destacada', destacado: true, fechaInicio: manana }),
          ]),
    );
    await montar(<Inicio />);
    expect(await screen.findByText(/Mañana · Comunicado/)).toBeTruthy();
    expect(screen.getByLabelText(/Feria destacada/)).toBeTruthy();
  });

  it('una devuelta por /destacadas no se repite en Próximas', async () => {
    const manana = new Date(Date.now() - 4 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
    const d = pub({ id: 'd1', titulo: 'Doble', destacado: true, fechaInicio: manana });
    apiMock.mockResolvedValue(lista([d]));
    await montar(<Inicio />);
    expect(await screen.findByLabelText(/Destacado\. Doble/)).toBeTruthy();
    expect(screen.getByText('No hay actividades próximas por ahora.')).toBeTruthy();
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

describe('RF-15 Salud conserva lo ya mostrado si falla una actualización', () => {
  it('un refetch fallido mantiene la lista y no muestra el error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    apiMock.mockResolvedValue(lista([pub({ id: 's1', titulo: 'Vacunación infantil' })]));
    await render(
      <QueryClientProvider client={client}>
        <PaperProvider theme={tema}>
          <Salud />
        </PaperProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Vacunación infantil')).toBeTruthy();
    apiMock.mockRejectedValue(new Error('Sin señal'));
    await client.refetchQueries();
    await waitFor(() =>
      expect(client.getQueryState(['publico', 'lista', 'SALUD'])?.status).toBe('error'),
    );
    expect(screen.getByText('Vacunación infantil')).toBeTruthy();
    expect(screen.queryByText('No se pudo cargar')).toBeNull();
  });
});

describe('RF-15 Detalle de publicación', () => {
  it('un id inválido redirige al inicio', async () => {
    mockParams = { id: 'no-es-uuid' };
    await montar(<Detalle />);
    expect(screen.getByText('redirige:/')).toBeTruthy();
  });

  it('un 404 muestra el estado de error con reintento', async () => {
    mockParams = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' };
    apiMock.mockRejectedValue(new Error('Publicación no encontrada'));
    await montar(<Detalle />);
    expect(await screen.findByText('No se pudo cargar')).toBeTruthy();
    expect(screen.getByText('Publicación no encontrada')).toBeTruthy();
    expect(screen.getByLabelText('Reintentar')).toBeTruthy();
  });

  it('muestra la unidad educativa y no deja cadenas vacías sueltas', async () => {
    mockParams = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' };
    apiMock.mockResolvedValue({
      publicacion: pub({ unidadEducativa: 'U.E. Bélgica', tipoVacuna: '' }),
      generadoEn: '2026-11-04T12:00:00.000Z',
    });
    await montar(<Detalle />);
    expect(await screen.findByText('Unidad educativa: U.E. Bélgica')).toBeTruthy();
  });
});

describe('Sello "Actualizado"', () => {
  it('toma el instante más antiguo e ignora los indefinidos', () => {
    const r = masAntiguo('2026-11-04T12:00:00.000Z', undefined, '2026-11-04T10:00:00.000Z');
    expect(r?.toISOString()).toBe('2026-11-04T10:00:00.000Z');
    expect(masAntiguo(undefined)).toBeNull();
  });
});
