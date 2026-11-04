import type { ErrorRequestHandler } from 'express';

// Respuesta genérica: nunca se filtra el detalle interno al cliente.
export const manejarError: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err?.status ?? err?.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Solicitud inválida' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
