import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImagenesFicha } from '../features/publicaciones/ImagenesFicha';
import * as imagenes from '../features/publicaciones/imagenes';

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...a: unknown[]) => mockLaunch(...a),
}));
jest.mock('../features/publicaciones/imagenes');

const montar = (asegurar: () => Promise<string | null>, alCrear = jest.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ImagenesFicha imagenes={[]} asegurarBorrador={asegurar} onBorradorCreado={alCrear} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(imagenes.pedirFirma).mockResolvedValue({} as never);
  mockLaunch.mockResolvedValue({ canceled: true, assets: [] });
});

it('RF-05: sin ficha, "Añadir" crea el borrador y pide la firma con ese id', async () => {
  const alCrear = jest.fn();
  await montar(() => Promise.resolve('nuevo-1'), alCrear);
  expect(screen.getByText('Al añadir una imagen, la ficha se guarda como borrador.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Añadir imagen'));
  await waitFor(() => expect(imagenes.pedirFirma).toHaveBeenCalledWith('nuevo-1'));
  await waitFor(() => expect(alCrear).toHaveBeenCalledWith('nuevo-1'));
});

it('RF-05: si la ficha no es válida avisa y no abre la galería', async () => {
  await montar(() => Promise.resolve(null));
  await fireEvent.press(screen.getByLabelText('Añadir imagen'));
  await waitFor(() =>
    expect(
      screen.getByText('Complete los campos marcados para poder añadir imágenes.'),
    ).toBeTruthy(),
  );
  expect(mockLaunch).not.toHaveBeenCalled();
  expect(imagenes.pedirFirma).not.toHaveBeenCalled();
});

it('RF-05: si el servidor falla muestra su mensaje, no el de ficha inválida, y no abre la galería', async () => {
  await montar(() => Promise.reject(new Error('La conexión tardó demasiado. Intente de nuevo.')));
  await fireEvent.press(screen.getByLabelText('Añadir imagen'));
  await waitFor(() =>
    expect(screen.getByText('La conexión tardó demasiado. Intente de nuevo.')).toBeTruthy(),
  );
  expect(screen.queryByText(/Complete los campos marcados/)).toBeNull();
  expect(mockLaunch).not.toHaveBeenCalled();
});
