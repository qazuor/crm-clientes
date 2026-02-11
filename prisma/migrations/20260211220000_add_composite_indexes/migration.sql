-- CreateIndex
CREATE INDEX "actividades_deletedAt_fecha_idx" ON "actividades"("deletedAt", "fecha");

-- CreateIndex
CREATE INDEX "actividades_tipo_fecha_idx" ON "actividades"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "mensajes_canal_estado_createdAt_idx" ON "mensajes"("canal", "estado", "createdAt");
