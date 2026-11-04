import type { ErrorRequestHandler } from 'express';

/** Error de dominio con mensaje apto para el cliente (nunca con detalle interno). */
export class ErrorHttp extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

// Respuesta genérica: nunca se filtra el detalle interno al cliente.
export const manejarError: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ErrorHttp) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const status = err?.status ?? err?.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Solicitud inválida' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
