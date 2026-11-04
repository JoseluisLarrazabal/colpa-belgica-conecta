const { resolve } = require('node:path');
// Carga .env.test de la raíz (local); en CI DATABASE_URL ya viene del entorno y dotenv no la pisa.
require('dotenv').config({ path: resolve(__dirname, '../../../.env.test'), quiet: true });

// Guard duro: los tests migran y escriben; jamás deben tocar una base que no sea de pruebas.
const url = process.env.DATABASE_URL;
const base = url ? new URL(url).pathname.slice(1) : '';
if (!base.endsWith('_test')) {
  throw new Error(
    `DATABASE_URL debe apuntar a una base que termine en "_test" (actual: "${base}")`,
  );
}

// Secreto solo para pruebas (≥ 32 caracteres); en local/CI no hace falta definirlo.
process.env.JWT_SECRET ??= 'secreto-solo-para-pruebas-0123456789abcdef';
