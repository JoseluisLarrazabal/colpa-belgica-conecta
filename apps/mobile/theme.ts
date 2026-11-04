import { Platform, type TextStyle } from 'react-native';
import { MD3LightTheme, configureFonts } from 'react-native-paper';

/** Tokens de la propuesta C (docs/diseno/propuesta-C.html). Única fuente de color de la app. */
export const colores = {
  primary: '#1A56A0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D6E4F7',
  onPrimaryContainer: '#001D36',
  secondary: '#2E75B6',
  background: '#F6F9FF',
  surface: '#FAFCFF',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  outline: '#79747E',
  error: '#B3261E',
  success: '#047857',
  warning: '#B45309',
} as const;

export const RADIO = 8;
export const OBJETIVO_TACTIL = 48;

// En web 'system-ui' toma la fuente del SO (monoespaciada en algunos Linux); se fija una pila
// sans-serif. En Android 'System' ya es Roboto.
const fontFamily = Platform.select({
  web: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  default: 'System',
});
const estilo = (fontSize: number, lineHeight: number, fontWeight: '400' | '500' = '400') =>
  ({ fontFamily, fontSize, lineHeight, fontWeight }) satisfies TextStyle;

/** Escala tipográfica 28/24/22/16(500)/16/14/14(500); nada por debajo de 14. */
export const tipo = {
  t28: estilo(28, 36, '500'),
  t24: estilo(24, 32, '500'),
  t22: estilo(22, 28, '500'),
  t16m: estilo(16, 24, '500'),
  t16: estilo(16, 24),
  t14: estilo(14, 20),
  t14m: estilo(14, 20, '500'),
} as const;
export type VarianteTipo = keyof typeof tipo;

export const tema = {
  ...MD3LightTheme,
  roundness: RADIO,
  fonts: configureFonts({
    config: {
      displaySmall: tipo.t28,
      headlineMedium: tipo.t24,
      titleLarge: tipo.t22,
      titleMedium: tipo.t16m,
      bodyLarge: tipo.t16,
      bodyMedium: tipo.t14,
      labelLarge: tipo.t14m,
    },
  }),
  colors: {
    ...MD3LightTheme.colors,
    primary: colores.primary,
    onPrimary: colores.onPrimary,
    primaryContainer: colores.primaryContainer,
    onPrimaryContainer: colores.onPrimaryContainer,
    secondary: colores.secondary,
    background: colores.background,
    surface: colores.surface,
    onSurface: colores.onSurface,
    onSurfaceVariant: colores.onSurfaceVariant,
    outline: colores.outline,
    error: colores.error,
  },
};
