import type { Request, Response } from 'express';
import type { ListarPublicasInput } from '@colpa/shared';
import * as publico from '../services/publico.service';

/** Siempre revalida (`no-cache`); con ETag igual, Express responde 304 sin cuerpo (ahorra datos con señal débil). */
const enviar = (res: Response, r: { etag: string; cuerpo: object }) => {
  res.set({ ETag: r.etag, 'Cache-Control': 'no-cache' });
  res.json(r.cuerpo);
};

export const listar = async (req: Request, res: Response) =>
  enviar(res, await publico.listar(req.query as unknown as ListarPublicasInput));
export const destacadas = async (_req: Request, res: Response) =>
  enviar(res, await publico.destacadas());
export const detalle = async (req: Request, res: Response) =>
  enviar(res, await publico.detalle(req.params['id'] as string));
