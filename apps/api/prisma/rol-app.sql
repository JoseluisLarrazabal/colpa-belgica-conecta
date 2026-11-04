-- Permisos del rol de la app (colpa_app) en entornos alojados (Neon).
-- Se ejecuta A MANO por el dueño (neondb_owner, DIRECT_URL) después de cada `prisma migrate deploy`.
-- Antes, crear el rol una vez: neon roles create --name colpa_app --access read_write --project-id <id> --branch <rama>
-- Es idempotente. La API corre con colpa_app, no con el dueño: sin DDL y sin poder mutar la auditoría (RF-10).

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
-- La app no toca el historial de migraciones.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON _prisma_migrations FROM colpa_app;
