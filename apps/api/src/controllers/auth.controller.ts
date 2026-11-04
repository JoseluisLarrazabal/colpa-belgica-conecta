import type { Request, Response } from 'express';
import type { LoginInput } from '@colpa/shared';
import { cerrarSesion, iniciarSesion } from '../services/auth.service';

export async function login(req: Request, res: Response): Promise<void> {
  const { identificadorCuenta, contrasena } = req.body as LoginInput;
  res.json(await iniciarSesion(identificadorCuenta, contrasena));
}

export async function logout(req: Request, res: Response): Promise<void> {
  await cerrarSesion(req.sesion!);
  res.status(204).end();
}
