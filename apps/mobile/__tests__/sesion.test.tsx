import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ProveedorSesion, useSesion } from '../lib/sesion';
import { fijarToken, tokenActual } from '../lib/api';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;
const funcionario = { id: 'f1', nombreCompleto: 'Ana', rol: 'PUBLICADOR', unidadId: 'u1' };
const fetchMock = jest.fn();

const envoltura = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } })
    }
  >
    <ProveedorSesion>{children}</ProveedorSesion>
  </QueryClientProvider>
);
const json = (cuerpo: unknown) =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(cuerpo)) });

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  jest.clearAllMocks();
  fijarToken(null);
  store.getItemAsync.mockResolvedValue(null);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

it('entrar guarda la sesión y salir la borra y avisa al servidor con el token previo', async () => {
  const sesion = {
    token: 'tok',
    expiraEn: new Date(Date.now() + 3600_000).toISOString(),
    funcionario,
  };
  fetchMock.mockReturnValue(json(sesion));
  const { result } = await renderHook(() => useSesion(), { wrapper: envoltura });
  await waitFor(() => expect(result.current.cargando).toBe(false));

  await act(() => result.current.entrar({ identificadorCuenta: 'ana', contrasena: 'x' }));
  expect(store.setItemAsync).toHaveBeenCalledWith('sesion_funcionario', JSON.stringify(sesion));
  expect(result.current.funcionario).toEqual(funcionario);

  fetchMock.mockReturnValue(json(null));
  await act(() => result.current.salir());
  expect(store.deleteItemAsync).toHaveBeenCalledWith('sesion_funcionario');
  expect(result.current.funcionario).toBeNull();
  expect(tokenActual()).toBeNull();
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  expect(url).toContain('/auth/logout');
  expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok');
});

it('restaura una sesión guardada vigente', async () => {
  const g = {
    token: 'viejo',
    expiraEn: new Date(Date.now() + 3600_000).toISOString(),
    funcionario,
  };
  store.getItemAsync.mockResolvedValue(JSON.stringify(g));
  const { result } = await renderHook(() => useSesion(), { wrapper: envoltura });
  await waitFor(() => expect(result.current.cargando).toBe(false));
  expect(result.current.funcionario).toEqual(funcionario);
});

it('no restaura un token guardado con expiraEn pasada', async () => {
  const g = { token: 'viejo', expiraEn: new Date(Date.now() - 1000).toISOString(), funcionario };
  store.getItemAsync.mockResolvedValue(JSON.stringify(g));
  const { result } = await renderHook(() => useSesion(), { wrapper: envoltura });
  await waitFor(() => expect(result.current.cargando).toBe(false));
  expect(result.current.funcionario).toBeNull();
  expect(tokenActual()).toBeNull();
});
