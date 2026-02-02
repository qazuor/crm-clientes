-- AlterTable (remove legacy JSON enrichment fields from clientes)
ALTER TABLE "clientes" DROP COLUMN "enrichmentData",
DROP COLUMN "lastEnrichment",
DROP COLUMN "pageSpeedScore",
DROP COLUMN "screenshotDesktop",
DROP COLUMN "screenshotMobile",
DROP COLUMN "socialProfiles",
DROP COLUMN "techStack",
DROP COLUMN "websiteMetrics";
