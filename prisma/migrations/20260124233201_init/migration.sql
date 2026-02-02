-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('NUEVO', 'CONTACTADO', 'CALIFICADO', 'INTERESADO', 'PROPUESTA_ENVIADA', 'NEGOCIACION', 'CONVERTIDO', 'PERDIDO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "PrioridadCliente" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "FuenteCliente" AS ENUM ('MANUAL', 'WEB', 'REFERIDO', 'MARKETING', 'COLD_CALL', 'EVENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('LLAMADA', 'EMAIL', 'REUNION', 'TAREA', 'NOTA', 'PROPUESTA', 'SEGUIMIENTO', 'CLIENTE_CREADO', 'CLIENTE_EDITADO', 'CLIENTE_ELIMINADO', 'IA_ENRIQUECIMIENTO', 'CONTACTO_AUTOMATICO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "codigoPostal" TEXT,
    "industria" TEXT,
    "fuente" "FuenteCliente" NOT NULL DEFAULT 'MANUAL',
    "estado" "EstadoCliente" NOT NULL DEFAULT 'NUEVO',
    "prioridad" "PrioridadCliente" NOT NULL DEFAULT 'MEDIA',
    "scoreConversion" DOUBLE PRECISION DEFAULT 0,
    "agentId" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaModific" TIMESTAMP(3) NOT NULL,
    "ultimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "esResponsive" BOOLEAN,
    "facebook" TEXT,
    "instagram" TEXT,
    "linkedin" TEXT,
    "sitioWeb" TEXT,
    "tieneSSL" BOOLEAN,
    "twitter" TEXT,
    "whatsapp" TEXT,
    "ultimaIA" TIMESTAMP(3),
    "screenshotDesktop" TEXT,
    "screenshotMobile" TEXT,
    "pageSpeedScore" TEXT,
    "websiteMetrics" TEXT,
    "techStack" TEXT,
    "socialProfiles" TEXT,
    "lastEnrichment" TIMESTAMP(3),
    "enrichmentData" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "resultado" TEXT,
    "proximoPaso" TEXT,
    "esAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotas" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL,
    "lastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),

    CONSTRAINT "quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrichment_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "matchMode" TEXT NOT NULL DEFAULT 'fuzzy',
    "minConfidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "requireVerification" BOOLEAN NOT NULL DEFAULT true,
    "maxResultsPerField" INTEGER NOT NULL DEFAULT 3,
    "enableScreenshots" BOOLEAN NOT NULL DEFAULT true,
    "enablePageSpeed" BOOLEAN NOT NULL DEFAULT true,
    "enableSsl" BOOLEAN NOT NULL DEFAULT true,
    "enableTechStack" BOOLEAN NOT NULL DEFAULT true,
    "enableSeo" BOOLEAN NOT NULL DEFAULT true,
    "enableAccessibility" BOOLEAN NOT NULL DEFAULT true,
    "enableSecurity" BOOLEAN NOT NULL DEFAULT true,
    "enableCrawlability" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrichment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente_enrichments" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "website" TEXT,
    "websiteScore" DOUBLE PRECISION,
    "emails" TEXT,
    "phones" TEXT,
    "address" TEXT,
    "addressScore" DOUBLE PRECISION,
    "description" TEXT,
    "descriptionScore" DOUBLE PRECISION,
    "industry" TEXT,
    "industryScore" DOUBLE PRECISION,
    "companySize" TEXT,
    "companySizeScore" DOUBLE PRECISION,
    "socialProfiles" TEXT,
    "aiProvidersUsed" TEXT,
    "enrichedAt" TIMESTAMP(3),

    CONSTRAINT "cliente_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_analyses" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sslValid" BOOLEAN,
    "sslIssuer" TEXT,
    "sslExpiresAt" TIMESTAMP(3),
    "sslProtocol" TEXT,
    "performanceScore" INTEGER,
    "fcpMs" INTEGER,
    "lcpMs" INTEGER,
    "ttiMs" INTEGER,
    "cls" DOUBLE PRECISION,
    "mobileScore" INTEGER,
    "desktopScore" INTEGER,
    "hasViewportMeta" BOOLEAN,
    "breakpoints" TEXT,
    "mediaQueriesCount" INTEGER,
    "techStack" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoH1Count" INTEGER,
    "seoHasCanonical" BOOLEAN,
    "seoIndexable" BOOLEAN,
    "hasJsonLd" BOOLEAN,
    "jsonLdTypes" TEXT,
    "hasOpenGraph" BOOLEAN,
    "openGraphData" TEXT,
    "hasTwitterCards" BOOLEAN,
    "accessibilityScore" INTEGER,
    "accessibilityIssues" TEXT,
    "hasHttps" BOOLEAN,
    "hstsEnabled" BOOLEAN,
    "xFrameOptions" TEXT,
    "hasCsp" BOOLEAN,
    "isSafeBrowsing" BOOLEAN,
    "hasRobotsTxt" BOOLEAN,
    "robotsAllowsIndex" BOOLEAN,
    "hasSitemap" BOOLEAN,
    "sitemapUrl" TEXT,
    "sitemapUrlCount" INTEGER,
    "serverLocation" TEXT,
    "serverIp" TEXT,
    "screenshotDesktop" TEXT,
    "screenshotMobile" TEXT,
    "apisUsed" TEXT,
    "analyzedAt" TIMESTAMP(3),

    CONSTRAINT "website_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blob_files" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "clienteId" TEXT,
    "type" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blob_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "clientes_email_idx" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_telefono_idx" ON "clientes"("telefono");

-- CreateIndex
CREATE INDEX "clientes_estado_idx" ON "clientes"("estado");

-- CreateIndex
CREATE INDEX "clientes_agentId_idx" ON "clientes"("agentId");

-- CreateIndex
CREATE INDEX "clientes_industria_idx" ON "clientes"("industria");

-- CreateIndex
CREATE INDEX "clientes_prioridad_idx" ON "clientes"("prioridad");

-- CreateIndex
CREATE INDEX "clientes_fuente_idx" ON "clientes"("fuente");

-- CreateIndex
CREATE INDEX "clientes_fechaCreacion_idx" ON "clientes"("fechaCreacion");

-- CreateIndex
CREATE INDEX "clientes_nombre_idx" ON "clientes"("nombre");

-- CreateIndex
CREATE INDEX "clientes_deletedAt_idx" ON "clientes"("deletedAt");

-- CreateIndex
CREATE INDEX "clientes_estado_prioridad_idx" ON "clientes"("estado", "prioridad");

-- CreateIndex
CREATE INDEX "clientes_agentId_estado_idx" ON "clientes"("agentId", "estado");

-- CreateIndex
CREATE INDEX "clientes_deletedAt_estado_idx" ON "clientes"("deletedAt", "estado");

-- CreateIndex
CREATE INDEX "actividades_clienteId_idx" ON "actividades"("clienteId");

-- CreateIndex
CREATE INDEX "actividades_usuarioId_idx" ON "actividades"("usuarioId");

-- CreateIndex
CREATE INDEX "actividades_tipo_idx" ON "actividades"("tipo");

-- CreateIndex
CREATE INDEX "actividades_fecha_idx" ON "actividades"("fecha");

-- CreateIndex
CREATE INDEX "actividades_esAutomatica_idx" ON "actividades"("esAutomatica");

-- CreateIndex
CREATE INDEX "actividades_deletedAt_idx" ON "actividades"("deletedAt");

-- CreateIndex
CREATE INDEX "actividades_clienteId_fecha_idx" ON "actividades"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "actividades_usuarioId_fecha_idx" ON "actividades"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "actividades_deletedAt_clienteId_idx" ON "actividades"("deletedAt", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "quotas_service_key" ON "quotas"("service");

-- CreateIndex
CREATE INDEX "quotas_service_idx" ON "quotas"("service");

-- CreateIndex
CREATE INDEX "quotas_lastReset_idx" ON "quotas"("lastReset");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_provider_key" ON "api_keys"("provider");

-- CreateIndex
CREATE INDEX "api_keys_provider_idx" ON "api_keys"("provider");

-- CreateIndex
CREATE INDEX "api_keys_enabled_idx" ON "api_keys"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_enrichments_clienteId_key" ON "cliente_enrichments"("clienteId");

-- CreateIndex
CREATE INDEX "cliente_enrichments_clienteId_idx" ON "cliente_enrichments"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "website_analyses_clienteId_key" ON "website_analyses"("clienteId");

-- CreateIndex
CREATE INDEX "website_analyses_clienteId_idx" ON "website_analyses"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "blob_files_url_key" ON "blob_files"("url");

-- CreateIndex
CREATE INDEX "blob_files_clienteId_idx" ON "blob_files"("clienteId");

-- CreateIndex
CREATE INDEX "blob_files_type_idx" ON "blob_files"("type");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente_enrichments" ADD CONSTRAINT "cliente_enrichments_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_analyses" ADD CONSTRAINT "website_analyses_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
