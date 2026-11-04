import type { RequestHandler } from 'express';
import type { z } from 'zod';

/** Valida body o params con zod; 400 con errores por campo. Reemplaza la entrada por la versión parseada. */
export const validar =
  (schema: z.ZodType, parte: 'body' | 'params' = 'body'): RequestHandler =>
  (req, res, next) => {
    const r = schema.safeParse(req[parte]);
    if (!r.success) {
      res.status(400).json({ error: 'Datos inválidos', campos: r.error.flatten().fieldErrors });
      return;
    }
    req[parte] = r.data as never;
    next();
  };
