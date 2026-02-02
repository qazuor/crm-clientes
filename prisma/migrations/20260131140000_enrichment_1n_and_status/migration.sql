-- CreateEnum
CREATE TYPE "EnrichmentStatusEnum" AS ENUM ('NONE', 'PENDING', 'PARTIAL', 'COMPLETE');

-- DropIndex (remove unique constraint to allow 1:N)
DROP INDEX "cliente_enrichments_clienteId_key";

-- AlterTable (add enrichmentStatus to clientes)
ALTER TABLE "clientes" ADD COLUMN "enrichmentStatus" "EnrichmentStatusEnum" NOT NULL DEFAULT 'NONE';

-- CreateIndex (composite index for history queries)
CREATE INDEX "cliente_enrichments_clienteId_enrichedAt_idx" ON "cliente_enrichments"("clienteId", "enrichedAt");

-- CreateIndex (index for filtering by enrichmentStatus)
CREATE INDEX "clientes_enrichmentStatus_idx" ON "clientes"("enrichmentStatus");
