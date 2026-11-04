const { execSync } = require('node:child_process');

// Aplica las migraciones sobre la base de pruebas real antes de correr los tests.
module.exports = async () => {
  require('./env.cjs'); // carga el entorno y aborta si la base no es _test, antes de migrar
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit' });
};
