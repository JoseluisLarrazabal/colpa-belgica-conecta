import express from 'express';
import helmet from 'helmet';
import { TRUST_PROXY_HOPS } from './config';
import { manejarError } from './middleware/error';
import { crearApiV1, type OpcionesApi } from './routes';

export function crearApp(opciones?: OpcionesApi) {
  const app = express();
  // Detrás del proxy de Railway hace falta confiar en él para que el límite use la IP real del cliente.
  app.set('trust proxy', TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(express.json());
  app.use('/api/v1', crearApiV1(opciones));
  app.use(manejarError);
  return app;
}
