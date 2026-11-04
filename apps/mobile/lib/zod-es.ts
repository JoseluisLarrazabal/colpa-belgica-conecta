import { z } from 'zod';

// Mensajes de validación en español claro para los formularios (los schemas de @colpa/shared
// solo definen mensaje propio en unos pocos casos; el resto cae aquí).
z.config({
  customError: (iss) => {
    if (iss.code === 'invalid_type') return 'Este campo es obligatorio';
    if (iss.code === 'too_small' && iss.origin === 'string') return 'Este campo es obligatorio';
    if (iss.code === 'too_big' && iss.origin === 'string')
      return `Máximo ${String(iss.maximum)} caracteres`;
    if (iss.code === 'invalid_format' && iss.format === 'date') return 'Use el formato AAAA-MM-DD';
    return undefined;
  },
});
