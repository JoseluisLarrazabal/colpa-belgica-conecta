import '../lib/zod-es';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import NuevaCuenta from '../app/(panel)/cuentas/nueva';
import EditarCuenta from '../app/(panel)/cuentas/[id]';
import { tema } from '../theme';

const ID = '11111111-1111-4111-8111-111111111111';
const U1 = '22222222-2222-4222-8222-222222222222';
const U2 = '33333333-3333-4333-8333-333333333333';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({ id: '11111111-1111-4111-8111-111111111111' }),
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: true, isInternetReachable: true }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../lib/sesion', () => ({
  useSesion: () => ({ funcionario: { id: 'otro', nombreCompleto: 'Admin', rol: 'ADMIN_TECNICO' } }),
}));

const fetchMock = jest.fn();
const json = (status: number, cuerpo: unknown) =>
  Promise.resolve({
    ok: status < 400,
    status,
    text: () => Promise.resolve(JSON.stringify(cuerpo)),
  });
const UNIDADES = [
  { id: U1, nombre: 'Salud' },
  { id: U2, nombre: 'Obras' },
];
const CUENTA = {
  id: ID,
  nombreCompleto: 'Maria Quispe',
  identificadorCuenta: 'maria.quispe',
  rol: 'PUBLICADOR',
  unidadId: U1,
  activo: true,
  creadoEn: '2026-11-01T10:00:00.000Z',
};
/** Responde GET de unidades/cuentas; `escritura` atiende POST/PATCH/PUT. */
const responder = (escritura: (url: string, init: RequestInit) => Promise<unknown>) =>
  fetchMock.mockImplementation((url: string, init: RequestInit = {}) => {
    if (init.method && init.method !== 'GET') return escritura(url, init);
    return json(200, url.endsWith('/admin/unidades') ? UNIDADES : [CUENTA]);
  });
const escrituras = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method && init.method !== 'GET');

const montar = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PaperProvider theme={tema}>{ui}</PaperProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('RF-02 Nueva cuenta', () => {
  it('vacía pinta errores y no llama a la API', async () => {
    responder(() => json(201, CUENTA));
    await montar(<NuevaCuenta />);
    await fireEvent.press(await screen.findByLabelText('Crear cuenta'));
    await waitFor(() => expect(screen.getAllByText('Este campo es obligatorio').length).toBe(2));
    expect(screen.getByText('Elija la unidad municipal')).toBeTruthy();
    expect(screen.getByText('Use al menos 10 caracteres')).toBeTruthy();
    expect(escrituras()).toHaveLength(0);
  });

  it('con datos válidos hace POST con el cuerpo esperado', async () => {
    responder(() => json(201, CUENTA));
    await montar(<NuevaCuenta />);
    await fireEvent.changeText(await screen.findByLabelText('Nombre completo'), 'Maria Quispe');
    await fireEvent.changeText(screen.getByLabelText('Identificador de cuenta'), 'maria.quispe');
    await fireEvent.press(screen.getByText('Obras'));
    await fireEvent.press(screen.getByText('Aprobador'));
    await fireEvent.changeText(screen.getByLabelText('Contraseña inicial'), 'clave-larga-123');
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));
    await waitFor(() => expect(escrituras()).toHaveLength(1));
    const [url, init] = escrituras()[0];
    expect(url).toBe('http://localhost:3000/api/v1/admin/funcionarios');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      nombreCompleto: 'Maria Quispe',
      identificadorCuenta: 'maria.quispe',
      unidadId: U2,
      rol: 'APROBADOR',
      contrasena: 'clave-larga-123',
    });
  });

  it('un 409 del servidor se ve en el campo identificador', async () => {
    responder(() => json(409, { error: 'El identificador de cuenta ya existe' }));
    await montar(<NuevaCuenta />);
    await fireEvent.changeText(await screen.findByLabelText('Nombre completo'), 'Maria Quispe');
    await fireEvent.changeText(screen.getByLabelText('Identificador de cuenta'), 'maria.quispe');
    await fireEvent.press(screen.getByText('Salud'));
    await fireEvent.changeText(screen.getByLabelText('Contraseña inicial'), 'clave-larga-123');
    await fireEvent.press(screen.getByLabelText('Crear cuenta'));
    expect(await screen.findByText('El identificador de cuenta ya existe')).toBeTruthy();
  });
});

describe('RF-02 Desactivar cuenta', () => {
  it('pide confirmación y solo al confirmar hace PATCH { activo: false }', async () => {
    responder(() => json(200, { ...CUENTA, activo: false }));
    await montar(<EditarCuenta />);
    await fireEvent.press(await screen.findByLabelText('Desactivar cuenta'));
    expect(screen.getByText('Esta persona ya no podrá entrar al panel.')).toBeTruthy();
    expect(escrituras()).toHaveLength(0);
    await fireEvent.press(screen.getByLabelText('Confirmar desactivación'));
    await waitFor(() => expect(escrituras()).toHaveLength(1));
    const [url, init] = escrituras()[0];
    expect(url).toBe(`http://localhost:3000/api/v1/admin/funcionarios/${ID}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ activo: false });
  });
});

describe('RF-03 Asignar rol', () => {
  it('cambiar solo el rol hace PUT /rol y no hace PATCH', async () => {
    responder(() => json(200, { ...CUENTA, rol: 'APROBADOR' }));
    await montar(<EditarCuenta />);
    await fireEvent.press(await screen.findByText('Aprobador'));
    await fireEvent.press(screen.getByLabelText('Guardar cambios'));
    await waitFor(() => expect(escrituras()).toHaveLength(1));
    const [url, init] = escrituras()[0];
    expect(url).toBe(`http://localhost:3000/api/v1/admin/funcionarios/${ID}/rol`);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ rol: 'APROBADOR' });
  });
});
