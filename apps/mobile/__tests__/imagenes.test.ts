import { subirACloudinary, type FirmaCloudinary } from '../features/publicaciones/imagenes';
import { fijarToken } from '../lib/api';

const firma: FirmaCloudinary = {
  cloudName: 'demo',
  apiKey: 'k',
  allowed_formats: 'jpg,png',
  overwrite: false,
  public_id: 'publicaciones/1/x',
  timestamp: 1700000000,
  signature: 'firmado',
  maxImagenes: 4,
};

it('sube a Cloudinary solo con los campos firmados y sin Authorization', async () => {
  fijarToken('token-secreto');
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ public_id: 'publicaciones/1/x', format: 'jpg' }),
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  await subirACloudinary(firma, {
    uri: 'file:///x.jpg',
    mimeType: 'image/jpeg',
    fileName: 'x.jpg',
  });

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
  const headers = (init.headers ?? {}) as Record<string, string>;
  expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('authorization');
  const campos = [...(init.body as FormData).keys()].sort();
  expect(campos).toEqual([
    'allowed_formats',
    'api_key',
    'file',
    'overwrite',
    'public_id',
    'signature',
    'timestamp',
  ]);
  fijarToken(null);
});
