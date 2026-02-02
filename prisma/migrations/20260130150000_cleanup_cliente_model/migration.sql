-- Step 1: Drop agentId indexes first
DROP INDEX IF EXISTS "clientes_agentId_idx";
DROP INDEX IF EXISTS "clientes_agentId_estado_idx";

-- Step 2: Drop agentId and scoreConversion columns
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "agentId";
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "scoreConversion";

-- Step 3: Convert estado column to text temporarily, map values, then create new enum
ALTER TABLE "clientes" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "clientes" ALTER COLUMN "estado" TYPE TEXT USING "estado"::TEXT;

-- Map old values to new values
UPDATE "clientes" SET "estado" = 'PRIMER_CONTACTO' WHERE "estado" = 'CONTACTADO';
UPDATE "clientes" SET "estado" = 'EN_TRATATIVAS' WHERE "estado" IN ('CALIFICADO', 'INTERESADO');
UPDATE "clientes" SET "estado" = 'EN_DESARROLLO' WHERE "estado" IN ('PROPUESTA_ENVIADA', 'NEGOCIACION');
UPDATE "clientes" SET "estado" = 'FINALIZADO' WHERE "estado" IN ('CONVERTIDO', 'PERDIDO', 'INACTIVO');
-- NUEVO stays as NUEVO

-- Drop old enum and create new one
DROP TYPE "EstadoCliente";
CREATE TYPE "EstadoCliente" AS ENUM ('NUEVO', 'PRIMER_CONTACTO', 'EN_TRATATIVAS', 'EN_DESARROLLO', 'FINALIZADO', 'RECONTACTO');

-- Convert back to enum
ALTER TABLE "clientes" ALTER COLUMN "estado" TYPE "EstadoCliente" USING "estado"::"EstadoCliente";
ALTER TABLE "clientes" ALTER COLUMN "estado" SET DEFAULT 'NUEVO';

-- Step 4: Convert fuente column to text temporarily, map values, then create new enum
ALTER TABLE "clientes" ALTER COLUMN "fuente" DROP DEFAULT;
ALTER TABLE "clientes" ALTER COLUMN "fuente" TYPE TEXT USING "fuente"::TEXT;

-- Map old values to new values
UPDATE "clientes" SET "fuente" = 'MANUAL' WHERE "fuente" IN ('WEB', 'MARKETING', 'COLD_CALL', 'EVENTO', 'OTRO');
-- MANUAL and REFERIDO stay as-is

-- Drop old enum and create new one
DROP TYPE "FuenteCliente";
CREATE TYPE "FuenteCliente" AS ENUM ('IMPORTADO', 'MANUAL', 'REFERIDO', 'CONTACTO_CLIENTE');

-- Convert back to enum
ALTER TABLE "clientes" ALTER COLUMN "fuente" TYPE "FuenteCliente" USING "fuente"::"FuenteCliente";
ALTER TABLE "clientes" ALTER COLUMN "fuente" SET DEFAULT 'MANUAL';
