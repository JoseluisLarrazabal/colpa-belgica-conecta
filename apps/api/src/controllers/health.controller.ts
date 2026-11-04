import type { Request, Response } from 'express';
import { comprobarBaseDeDatos } from '../services/health.service';

export async function health(_req: Request, res: Response): Promise<void> {
  try {
    await comprobarBaseDeDatos();
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    console.error(
      'health: fallo la comprobación de la base de datos:',
      err instanceof Error ? err.message : err,
    );
    res.status(503).json({ status: 'error', db: 'error' });
  }
}
