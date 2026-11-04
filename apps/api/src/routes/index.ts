import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  asignarRolSchema,
  crearCuentaSchema,
  editarCuentaSchema,
  idParamSchema,
  loginSchema,
} from '@colpa/shared';
import { health } from '../controllers/health.controller';
import { login, logout } from '../controllers/auth.controller';
import * as cuentas from '../controllers/cuentas.controller';
import { autenticar, requiereRol } from '../middleware/auth';
import { validar } from '../middleware/validar';

export interface OpcionesApi {
  loginMax?: number;
}

export function crearApiV1({ loginMax = 10 }: OpcionesApi = {}) {
  const r = Router();
  r.get('/health', health);

  // shortcut: memoria por proceso; usar store compartido si hay >1 réplica
  const limiteLogin = rateLimit({
    windowMs: 15 * 60_000,
    limit: loginMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, inténtalo más tarde' },
  });
  r.post('/auth/login', limiteLogin, validar(loginSchema), login);
  r.post('/auth/logout', autenticar, logout);

  const admin = Router();
  admin.use(autenticar, requiereRol('GESTIONAR_CUENTAS'));
  admin.get('/unidades', cuentas.unidades);
  admin.get('/funcionarios', cuentas.listar);
  admin.post('/funcionarios', validar(crearCuentaSchema), cuentas.crear);
  admin.patch(
    '/funcionarios/:id',
    validar(idParamSchema, 'params'),
    validar(editarCuentaSchema),
    cuentas.editar,
  );
  admin.put(
    '/funcionarios/:id/rol',
    validar(idParamSchema, 'params'),
    validar(asignarRolSchema),
    cuentas.asignarRol,
  );
  r.use('/admin', admin);
  return r;
}
