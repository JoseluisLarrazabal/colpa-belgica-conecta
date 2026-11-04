-- Cada tipo pertenece a un único módulo (catálogo de packages/shared/src/catalogo.ts).
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_tipo_modulo_chk" CHECK (
  ("modulo" = 'SALUD' AND "tipo" IN ('CAMPANA_VACUNACION', 'JORNADA_ATENCION', 'ENTREGA_MEDICAMENTOS', 'COMUNICADO_SANITARIO'))
  OR ("modulo" = 'EDUCACION' AND "tipo" IN ('ACTIVIDAD_ESCOLAR', 'COMUNICADO_EDUCACION'))
  OR ("modulo" = 'EVENTOS' AND "tipo" IN ('FERIA', 'REUNION_VECINAL', 'ACTIVIDAD_CULTURAL', 'ACTIVIDAD_DEPORTIVA'))
);
