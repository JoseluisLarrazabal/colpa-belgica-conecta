import { Router } from 'express';
import { health } from '../controllers/health.controller';

export const apiV1 = Router();
apiV1.get('/health', health);
