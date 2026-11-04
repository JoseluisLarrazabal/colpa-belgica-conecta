-- CreateEnum
CREATE TYPE "rol_funcionario" AS ENUM ('PUBLICADOR', 'APROBADOR', 'ADMIN_TECNICO');

-- CreateEnum
CREATE TYPE "area_unidad" AS ENUM ('SALUD', 'EDUCACION', 'DESARROLLO_COMUNITARIO', 'COMUNICACION');

-- CreateEnum
CREATE TYPE "modulo" AS ENUM ('SALUD', 'EDUCACION', 'EVENTOS');

-- CreateEnum
CREATE TYPE "tipo_publicacion" AS ENUM ('CAMPANA_VACUNACION', 'JORNADA_ATENCION', 'ENTREGA_MEDICAMENTOS', 'COMUNICADO_SANITARIO', 'ACTIVIDAD_ESCOLAR', 'COMUNICADO_EDUCACION', 'FERIA', 'REUNION_VECINAL', 'ACTIVIDAD_CULTURAL', 'ACTIVIDAD_DEPORTIVA');

-- CreateEnum
CREATE TYPE "estado_publicacion" AS ENUM ('BORRADOR', 'EN_REVISION', 'PUBLICADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "tipo_establecimiento" AS ENUM ('CENTRO_SALUD', 'UNIDAD_EDUCATIVA');

-- CreateEnum
CREATE TYPE "plataforma" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "tipo_notificacion" AS ENUM ('PUBLICACION', 'RECORDATORIO');

-- CreateTable
CREATE TABLE "unidad" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "area" "area_unidad" NOT NULL,

    CONSTRAINT "unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionario" (
    "id" UUID NOT NULL,
    "nombre_completo" VARCHAR(120) NOT NULL,
    "identificador_cuenta" VARCHAR(60) NOT NULL,
    "hash_contrasena" VARCHAR(255) NOT NULL,
    "rol" "rol_funcionario" NOT NULL,
    "unidad_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_fallidos" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacion" (
    "id" UUID NOT NULL,
    "modulo" "modulo" NOT NULL,
    "tipo" "tipo_publicacion" NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "detalle" TEXT,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "hora" TIME(6),
    "lugar" VARCHAR(150),
    "poblacion_objetivo" VARCHAR(150),
    "requisitos" TEXT,
    "tipo_vacuna" VARCHAR(100),
    "unidad_educativa" VARCHAR(150),
    "establecimiento_id" UUID,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "estado_publicacion" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "unidad_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "aprobador_id" UUID,
    "publicado_en" TIMESTAMPTZ(6),
    "archivado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagen" (
    "id" UUID NOT NULL,
    "publicacion_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establecimiento" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" "tipo_establecimiento" NOT NULL,
    "latitud" DECIMAL(9,6) NOT NULL,
    "longitud" DECIMAL(9,6) NOT NULL,
    "direccion" VARCHAR(200),
    "horario_atencion" VARCHAR(200) NOT NULL,
    "telefono" VARCHAR(30),
    "estado" "estado_publicacion" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "unidad_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "aprobador_id" UUID,
    "publicado_en" TIMESTAMPTZ(6),
    "archivado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "establecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" UUID NOT NULL,
    "token_push" VARCHAR(255) NOT NULL,
    "plataforma" "plataforma" NOT NULL,
    "registrado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_contacto" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recordatorio" (
    "id" UUID NOT NULL,
    "publicacion_id" UUID NOT NULL,
    "anticipacion_minutos" INTEGER NOT NULL,
    "programado_para" TIMESTAMPTZ(6) NOT NULL,
    "enviado_en" TIMESTAMPTZ(6),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" UUID NOT NULL,
    "publicacion_id" UUID,
    "tipo" "tipo_notificacion" NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "enviada_en" TIMESTAMPTZ(6) NOT NULL,
    "total_enviadas" INTEGER NOT NULL DEFAULT 0,
    "total_entregadas" INTEGER NOT NULL DEFAULT 0,
    "total_abiertas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "accion" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40) NOT NULL,
    "entidad_id" UUID NOT NULL,
    "estado_resultante" "estado_publicacion",
    "detalle" TEXT,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion_revocada" (
    "id" UUID NOT NULL,
    "funcionario_id" UUID NOT NULL,
    "jti" VARCHAR(64) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "revocada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_revocada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidad_nombre_key" ON "unidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "funcionario_identificador_cuenta_key" ON "funcionario"("identificador_cuenta");

-- CreateIndex
CREATE INDEX "publicacion_modulo_estado_fecha_inicio_idx" ON "publicacion"("modulo", "estado", "fecha_inicio");

-- CreateIndex
CREATE INDEX "publicacion_estado_destacado_idx" ON "publicacion"("estado", "destacado");

-- CreateIndex
CREATE INDEX "publicacion_actualizado_en_idx" ON "publicacion"("actualizado_en");

-- CreateIndex
CREATE INDEX "publicacion_unidad_id_estado_idx" ON "publicacion"("unidad_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "imagen_public_id_key" ON "imagen"("public_id");

-- CreateIndex
CREATE INDEX "establecimiento_tipo_estado_idx" ON "establecimiento"("tipo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_token_push_key" ON "dispositivo"("token_push");

-- CreateIndex
CREATE INDEX "recordatorio_programado_para_enviado_en_idx" ON "recordatorio"("programado_para", "enviado_en");

-- CreateIndex
CREATE INDEX "notificacion_enviada_en_idx" ON "notificacion"("enviada_en");

-- CreateIndex
CREATE INDEX "registro_auditoria_entidad_entidad_id_fecha_idx" ON "registro_auditoria"("entidad", "entidad_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_revocada_jti_key" ON "sesion_revocada"("jti");

-- CreateIndex
CREATE INDEX "sesion_revocada_expira_en_idx" ON "sesion_revocada"("expira_en");

-- AddForeignKey
ALTER TABLE "funcionario" ADD CONSTRAINT "funcionario_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_establecimiento_id_fkey" FOREIGN KEY ("establecimiento_id") REFERENCES "establecimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagen" ADD CONSTRAINT "imagen_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_aprobador_id_fkey" FOREIGN KEY ("aprobador_id") REFERENCES "funcionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion_revocada" ADD CONSTRAINT "sesion_revocada_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones CHECK de las Tablas 2.55, 2.57 y 2.59 (Prisma no las declara en el schema).
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_fecha_fin_check" CHECK ("fecha_fin" IS NULL OR "fecha_inicio" IS NULL OR "fecha_fin" >= "fecha_inicio");
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_latitud_check" CHECK ("latitud" BETWEEN -90 AND 90);
ALTER TABLE "establecimiento" ADD CONSTRAINT "establecimiento_longitud_check" CHECK ("longitud" BETWEEN -180 AND 180);
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_anticipacion_check" CHECK ("anticipacion_minutos" > 0);
