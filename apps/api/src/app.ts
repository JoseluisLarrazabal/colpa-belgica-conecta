import express from 'express';
import { manejarError } from './middleware/error';
import { apiV1 } from './routes';

export function crearApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiV1);
  app.use(manejarError);
  return app;
}
