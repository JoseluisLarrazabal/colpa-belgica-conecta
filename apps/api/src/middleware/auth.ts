import type { RequestHandler } from 'express';
import { puede, type Permiso } from '@colpa/shared';
import { validarToken, type Sesion } from '../services/auth.service';
import { ErrorHttp } from './error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma oficial de ampliar Request de Express
  namespace Express {
    interface Request {
      sesion?: Sesion;
    }
  }
}

export const autenticar: RequestHandler = async (req, _res, next) => {
  const m = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
  if (!m) throw new ErrorHttp(401, 'No autenticado');
  req.sesion = await validarToken(m[1]!);
  next();
};

/** RNF-28: comprobación de rol en el servidor, derivada de la matriz de permisos compartida. */
export const requiereRol =
  (permiso: Permiso): RequestHandler =>
  (req, _res, next) => {
    if (!req.sesion || !puede(req.sesion.rol, permiso)) throw new ErrorHttp(403, 'Acceso denegado');
    next();
  };
