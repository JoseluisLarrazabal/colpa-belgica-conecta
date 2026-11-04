import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  asignarRolSchema,
  consultarAuditoriaSchema,
  crearCuentaSchema,
  devolverSchema,
  editarCuentaSchema,
  editarFichaSchema,
  fichaSchema,
  idParamSchema,
  imagenParamSchema,
  listarPublicacionesSchema,
  listarPublicasSchema,
  loginSchema,
  registrarImagenSchema,
} from '@colpa/shared';
import { health } from '../controllers/health.controller';
import { login, logout } from '../controllers/auth.controller';
import * as cuentas from '../controllers/cuentas.controller';
import * as publico from '../controllers/publico.controller';
import * as pub from '../controllers/publicaciones.controller';
import { autenticar, requiereRol } from '../middleware/auth';
import { validar } from '../middleware/validar';

export interface OpcionesApi {
  loginMax?: number;
  publicoMax?: number;
}

export function crearApiV1({ loginMax = 10, publicoMax = 1000 }: OpcionesApi = {}) {
  const r = Router();
  r.get('/health', health);

  // shortcut: memoria por proceso; en Vercel serverless el conteo es por instancia y se reinicia en cold start,
  // así que el límite por IP es más débil que el nominal. El bloqueo por cuenta en BD (5 intentos/15 min) sí se
  // mantiene. Aceptado para la demo; pasar a store compartido (p. ej. Upstash Redis) antes de uso público real.
  const limiteLogin = rateLimit({
    windowMs: 15 * 60_000,
    limit: loginMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, inténtalo más tarde' },
  });
  r.post('/auth/login', limiteLogin, validar(loginSchema), login);
  r.post('/auth/logout', autenticar, logout);

  // shortcut: memoria por proceso; en Vercel serverless el conteo es por instancia y se reinicia en cold start
  // (más débil que el nominal); aceptado para la demo, pasar a store compartido (p. ej. Upstash Redis) antes de uso
  // público real. Límite por IP, y las operadoras móviles
  // comparten IP pública (CGNAT), por eso es holgado: subirlo o limitar por otra clave si hay falsos 429.
  const limitePublico = rateLimit({
    windowMs: 15 * 60_000,
    limit: publicoMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, inténtalo más tarde' },
  });
  // Públicas (Tabla 2.64): sin autenticación, solo lectura. `destacadas` va antes de `:id`.
  r.get('/publicaciones', limitePublico, validar(listarPublicasSchema, 'query'), publico.listar);
  r.get('/publicaciones/destacadas', limitePublico, publico.destacadas);
  r.get('/publicaciones/:id', limitePublico, validar(idParamSchema, 'params'), publico.detalle);

  // Panel (Tabla 2.64). El rol se comprueba aquí; la propiedad por unidad, en el servicio.
  const panel = Router();
  panel.use(autenticar);
  const idP = validar(idParamSchema, 'params');
  const elabora = requiereRol('ELABORAR_PUBLICACION');
  panel.get(
    '/publicaciones',
    requiereRol('CONSULTAR_PANEL'),
    validar(listarPublicacionesSchema, 'query'),
    pub.listar,
  );
  panel.get('/publicaciones/:id', requiereRol('CONSULTAR_PANEL'), idP, pub.obtener);
  panel.post('/publicaciones', elabora, validar(fichaSchema), pub.crear);
  panel.patch('/publicaciones/:id', elabora, idP, validar(editarFichaSchema), pub.editar);
  panel.delete('/publicaciones/:id', elabora, idP, pub.descartar);
  panel.post(
    '/publicaciones/:id/enviar',
    requiereRol('ENVIAR_REVISION'),
    idP,
    pub.accion('ENVIAR_REVISION'),
  );
  panel.post('/publicaciones/:id/publicar', requiereRol('PUBLICAR'), idP, pub.accion('PUBLICAR'));
  panel.post(
    '/publicaciones/:id/devolver',
    requiereRol('DEVOLVER'),
    idP,
    validar(devolverSchema),
    pub.accion('DEVOLVER'),
  );
  panel.post('/publicaciones/:id/archivar', requiereRol('ARCHIVAR'), idP, pub.accion('ARCHIVAR'));
  panel.post('/publicaciones/:id/imagenes/firma', elabora, idP, pub.firmaImagen);
  panel.post(
    '/publicaciones/:id/imagenes',
    elabora,
    idP,
    validar(registrarImagenSchema),
    pub.registrarImagen,
  );
  panel.delete(
    '/publicaciones/:id/imagenes/:imagenId',
    elabora,
    validar(imagenParamSchema, 'params'),
    pub.eliminarImagen,
  );
  r.use('/panel', panel);

  const admin = Router();
  admin.use(autenticar, requiereRol('GESTIONAR_CUENTAS'));
  admin.get('/unidades', cuentas.unidades);
  admin.get(
    '/auditoria',
    requiereRol('CONSULTAR_AUDITORIA'),
    validar(consultarAuditoriaSchema, 'query'),
    pub.consultarAuditoria,
  );
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
