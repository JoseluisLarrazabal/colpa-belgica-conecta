import { render, screen } from '@testing-library/react-native';
import { EstadoChip, estadoVisual, type EstadoVisual } from '../components/EstadoChip';

const casos: [EstadoVisual, string][] = [
  ['BORRADOR', 'Borrador'],
  ['EN_REVISION', 'En revisión'],
  ['DEVUELTA', 'Devuelta'],
  ['PUBLICADO', 'Publicada'],
  ['ARCHIVADO', 'Archivada'],
  ['SIN_CONEXION', 'Sin conexión'],
];

it.each(casos)('EstadoChip %s muestra el texto %s', async (estado, texto) => {
  await render(<EstadoChip estado={estado} />);
  expect(screen.getByText(texto)).toBeTruthy();
});

it('un Borrador con observaciones se ve como Devuelta', () => {
  expect(estadoVisual({ estado: 'BORRADOR', observaciones: 'Aclare el carné' })).toBe('DEVUELTA');
  expect(estadoVisual({ estado: 'BORRADOR', observaciones: null })).toBe('BORRADOR');
  expect(estadoVisual({ estado: 'PUBLICADO', observaciones: 'x' })).toBe('PUBLICADO');
});
