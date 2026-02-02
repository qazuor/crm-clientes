-- AlterTable
ALTER TABLE "cliente_enrichments" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "cliente_enrichments" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "cliente_enrichments" ADD COLUMN "reviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "cliente_enrichments_status_idx" ON "cliente_enrichments"("status");
