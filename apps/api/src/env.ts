import { config } from 'dotenv';
import { resolve } from 'node:path';

// Un solo .env en la raíz del monorepo; no pisa variables ya definidas (CI).
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
