import { ApiError, alRechazarToken, api, fijarToken } from '../lib/api';

const respuesta = (status: number, cuerpo?: unknown) =>
  Promise.resolve({
    ok: status < 400,
    status,
    text: () => Promise.resolve(cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  } as Response);

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fijarToken(null);
  alRechazarToken(null);
});

it('adjunta el bearer y parsea JSON', async () => {
  fijarToken('abc');
  fetchMock.mockReturnValue(respuesta(200, { ok: 1 }));
  await expect(api('/panel/publicaciones')).resolves.toEqual({ ok: 1 });
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toContain('/api/v1/panel/publicaciones');
  expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer abc');
});

it('un 401 autenticado dispara el cierre de sesión', async () => {
  const salir = jest.fn();
  alRechazarToken(salir);
  fetchMock.mockReturnValue(respuesta(401, { error: 'Sesión inválida' }));
  await expect(api('/panel/publicaciones')).rejects.toMatchObject({ status: 401 });
  expect(salir).toHaveBeenCalledTimes(1);
});

it('un 401 del login (credenciales) no cierra sesión', async () => {
  const salir = jest.fn();
  alRechazarToken(salir);
  fetchMock.mockReturnValue(respuesta(401, { error: 'Credenciales inválidas' }));
  await expect(
    api('/auth/login', { metodo: 'POST', cuerpo: {}, autenticado: false }),
  ).rejects.toThrow('Credenciales inválidas');
  expect(salir).not.toHaveBeenCalled();
});

it('un 400 expone campos y errores para los formularios', async () => {
  fetchMock.mockReturnValue(
    respuesta(400, {
      error: 'Datos inválidos',
      campos: { hora: ['Hora HH:MM'] },
      errores: ['Revise'],
    }),
  );
  const e = await api('/x', { metodo: 'POST', cuerpo: {} }).catch((err: unknown) => err);
  expect(e).toBeInstanceOf(ApiError);
  expect(e).toMatchObject({ status: 400, campos: { hora: ['Hora HH:MM'] }, errores: ['Revise'] });
});

it('sin red devuelve status 0 y mensaje claro', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  await expect(api('/x')).rejects.toMatchObject({ status: 0 });
});

it('un cuerpo de error que no es JSON cae al mensaje genérico', async () => {
  fetchMock.mockReturnValue(
    Promise.resolve({
      ok: false,
      status: 502,
      text: () => Promise.resolve('<html>Bad gateway</html>'),
    } as Response),
  );
  await expect(api('/x')).rejects.toMatchObject({ status: 502, message: 'Error inesperado' });
});
