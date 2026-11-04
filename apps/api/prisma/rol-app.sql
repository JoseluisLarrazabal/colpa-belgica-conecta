-- Permisos del rol de la app (colpa_app) en entornos alojados (Neon). Idempotente.
-- Antes, crear el rol una vez: neon roles create --name colpa_app --access read_write --project-id <id> --branch <rama>
-- Procedimiento:
--  1. Las migraciones corren SIEMPRE como dueño (neondb_owner) con su URL DIRECTA (no pooler), pasada como
--     DATABASE_URL solo para ese comando:
--       DATABASE_URL="<url directa del dueño>" pnpm --filter api exec prisma migrate deploy
--  2. La API desplegada usa la URL con pooler de colpa_app (sin DDL ni mutación de auditoría, RF-10).
--  3. Los default privileges de abajo solo cubren objetos creados por neondb_owner: si otro rol hizo una
--     migración, volver a ejecutar este script como dueño.

GRANT USAGE ON SCHEMA public TO colpa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO colpa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO colpa_app;

-- Tablas y secuencias que creen migraciones futuras.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO colpa_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO colpa_app;

-- RF-10: la auditoría es solo de inserción (además de los triggers de la migración).
REVOKE UPDATE, DELETE, TRUNCATE ON registro_auditoria FROM colpa_app;
-- La app no lee ni escribe el historial de migraciones.
REVOKE ALL ON _prisma_migrations FROM colpa_app;
