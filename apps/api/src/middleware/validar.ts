import type { RequestHandler } from 'express';
import type { z } from 'zod';

/** Cuerpo 400 común (`{ error, campos, errores }`): lo usan este middleware y la validación de fichas. */
export function detalleValidacion(e: z.ZodError) {
  const { fieldErrors, formErrors } = e.flatten();
  return { campos: fieldErrors, errores: formErrors };
}

/** Valida body o params con zod; 400 con errores por campo. Reemplaza la entrada por la versión parseada. */
export const validar =
  (schema: z.ZodType, parte: 'body' | 'params' | 'query' = 'body'): RequestHandler =>
  (req, res, next) => {
    const entrada: unknown = req[parte];
    if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
      res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON' });
      return;
    }
    const r = schema.safeParse(entrada);
    if (!r.success) {
      res.status(400).json({ error: 'Datos inválidos', ...detalleValidacion(r.error) });
      return;
    }
    // En Express 5 `req.query` es un getter: se redefine en la instancia.
    Object.defineProperty(req, parte, { value: r.data, writable: true, configurable: true });
    next();
  };
