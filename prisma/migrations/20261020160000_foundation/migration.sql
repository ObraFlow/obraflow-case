CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "Project" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "rulesVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Project_name_check" CHECK (char_length(btrim("name")) > 0),
  CONSTRAINT "Project_rulesVersion_check" CHECK ("rulesVersion" >= 0)
);

CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_name_check" CHECK (char_length(btrim("name")) > 0)
);

CREATE TABLE "Supplier" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Supplier_name_check" CHECK (char_length(btrim("name")) > 0)
);

CREATE TABLE "ApprovalBand" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "upperLimit" DECIMAL(11,2),
  CONSTRAINT "ApprovalBand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalBand_position_check" CHECK ("position" BETWEEN 1 AND 20),
  CONSTRAINT "ApprovalBand_upperLimit_check" CHECK ("upperLimit" IS NULL OR "upperLimit" BETWEEN 0 AND 100000000.00)
);

CREATE TABLE "BandApprover" (
  "bandId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "BandApprover_pkey" PRIMARY KEY ("bandId", "position"),
  CONSTRAINT "BandApprover_position_check" CHECK ("position" BETWEEN 1 AND 10)
);

CREATE INDEX "Project_name_id_idx" ON "Project"("name", "id");
CREATE INDEX "User_name_id_idx" ON "User"("name", "id");
CREATE INDEX "Supplier_name_id_idx" ON "Supplier"("name", "id");
CREATE UNIQUE INDEX "ApprovalBand_projectId_position_key" ON "ApprovalBand"("projectId", "position");
CREATE UNIQUE INDEX "ApprovalBand_projectId_upperLimit_key" ON "ApprovalBand"("projectId", "upperLimit");
-- UNIQUE comum permite múltiplos NULLs; a faixa final exige índice parcial.
CREATE UNIQUE INDEX "ApprovalBand_one_unbounded_per_project" ON "ApprovalBand"("projectId") WHERE "upperLimit" IS NULL;
CREATE UNIQUE INDEX "BandApprover_bandId_userId_key" ON "BandApprover"("bandId", "userId");

ALTER TABLE "ApprovalBand" ADD CONSTRAINT "ApprovalBand_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BandApprover" ADD CONSTRAINT "BandApprover_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "ApprovalBand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BandApprover" ADD CONSTRAINT "BandApprover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
