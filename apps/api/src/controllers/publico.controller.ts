import type { Request, Response } from 'express';
import type { ListarPublicasInput } from '@colpa/shared';
import * as publico from '../services/publico.service';

/** El cliente siempre revalida con ETag (304 sin cuerpo); el CDN absorbe ráfagas 30 s. Tradeoff: una publicación nueva puede tardar ~30 s en aparecer. */
const enviar = (res: Response, r: { etag: string; cuerpo: object }) => {
  res.set({
    ETag: r.etag,
    'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
  });
  res.json(r.cuerpo);
};

export const listar = async (req: Request, res: Response) =>
  enviar(res, await publico.listar(req.query as unknown as ListarPublicasInput));
export const destacadas = async (_req: Request, res: Response) =>
  enviar(res, await publico.destacadas());
export const detalle = async (req: Request, res: Response) =>
  enviar(res, await publico.detalle(req.params['id'] as string));
