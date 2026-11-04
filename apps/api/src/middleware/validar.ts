import type { RequestHandler } from 'express';
import type { z } from 'zod';

/** Valida body o params con zod; 400 con errores por campo. Reemplaza la entrada por la versión parseada. */
export const validar =
  (schema: z.ZodType, parte: 'body' | 'params' = 'body'): RequestHandler =>
  (req, res, next) => {
    const entrada: unknown = req[parte];
    if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
      res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON' });
      return;
    }
    const r = schema.safeParse(entrada);
    if (!r.success) {
      const { fieldErrors, formErrors } = r.error.flatten();
      res.status(400).json({ error: 'Datos inválidos', campos: fieldErrors, errores: formErrors });
      return;
    }
    req[parte] = r.data as never;
    next();
  };
