-- CreateEnum
CREATE TYPE "CanalContacto" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');

-- CreateTable
CREATE TABLE "plantillas_contacto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "canal" "CanalContacto" NOT NULL,
    "asunto" TEXT,
    "cuerpo" TEXT NOT NULL,
    "esActiva" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "canal" "CanalContacto" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT,
    "cuerpo" TEXT NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'PENDIENTE',
    "errorDetalle" TEXT,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "plantillaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantillas_contacto_canal_idx" ON "plantillas_contacto"("canal");

-- CreateIndex
CREATE INDEX "plantillas_contacto_esActiva_idx" ON "plantillas_contacto"("esActiva");

-- CreateIndex
CREATE INDEX "plantillas_contacto_creadoPorId_idx" ON "plantillas_contacto"("creadoPorId");

-- CreateIndex
CREATE INDEX "mensajes_clienteId_idx" ON "mensajes"("clienteId");

-- CreateIndex
CREATE INDEX "mensajes_usuarioId_idx" ON "mensajes"("usuarioId");

-- CreateIndex
CREATE INDEX "mensajes_plantillaId_idx" ON "mensajes"("plantillaId");

-- CreateIndex
CREATE INDEX "mensajes_canal_idx" ON "mensajes"("canal");

-- CreateIndex
CREATE INDEX "mensajes_estado_idx" ON "mensajes"("estado");

-- CreateIndex
CREATE INDEX "mensajes_createdAt_idx" ON "mensajes"("createdAt");

-- CreateIndex
CREATE INDEX "mensajes_clienteId_createdAt_idx" ON "mensajes"("clienteId", "createdAt");

-- AddForeignKey
ALTER TABLE "plantillas_contacto" ADD CONSTRAINT "plantillas_contacto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_contacto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
