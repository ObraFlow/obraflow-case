-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('un', 'kg', 'm', 'm2', 'm3', 'h', 'sc', 'l');

-- CreateEnum
CREATE TYPE "HistoryType" AS ENUM ('CREATED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRule" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "maxAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRuleApprover" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ApprovalRuleApprover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "orderDate" DATE NOT NULL,
    "notes" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER,
    "ruleId" INTEGER,
    "ruleFromAmount" DECIMAL(14,2) NOT NULL,
    "ruleMaxAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "Unit" NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" "HistoryType" NOT NULL,
    "actorId" INTEGER NOT NULL,
    "stepPosition" INTEGER,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxId_key" ON "Supplier"("taxId");

-- CreateIndex
-- NULLS NOT DISTINCT (Postgres 15+): o NULL ("sem limite") conta como valor repetido,
-- então uma obra não pode ter duas faixas com o mesmo limite nem duas faixas "sem limite".
CREATE UNIQUE INDEX "ApprovalRule_projectId_maxAmount_key" ON "ApprovalRule"("projectId", "maxAmount") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRuleApprover_ruleId_position_key" ON "ApprovalRuleApprover"("ruleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRuleApprover_ruleId_userId_key" ON "ApprovalRuleApprover"("ruleId", "userId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_orderId_position_key" ON "PurchaseOrderItem"("orderId", "position");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_status_idx" ON "ApprovalStep"("approverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_orderId_position_key" ON "ApprovalStep"("orderId", "position");

-- CreateIndex
CREATE INDEX "PurchaseOrderEvent_orderId_createdAt_idx" ON "PurchaseOrderEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRuleApprover" ADD CONSTRAINT "ApprovalRuleApprover_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ApprovalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRuleApprover" ADD CONSTRAINT "ApprovalRuleApprover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ApprovalRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderEvent" ADD CONSTRAINT "PurchaseOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderEvent" ADD CONSTRAINT "PurchaseOrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Restrições de integridade que o schema do Prisma não consegue expressar.
-- ---------------------------------------------------------------------------

ALTER TABLE "ApprovalRule"
  ADD CONSTRAINT "ApprovalRule_maxAmount_positive" CHECK ("maxAmount" IS NULL OR "maxAmount" > 0);

ALTER TABLE "ApprovalRuleApprover"
  ADD CONSTRAINT "ApprovalRuleApprover_position_positive" CHECK ("position" >= 1);

ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "PurchaseOrderItem_unitPrice_non_negative" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "PurchaseOrderItem_total_non_negative" CHECK ("total" >= 0);

-- Pedido pendente sempre tem etapa atual; pedido finalizado nunca tem.
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_totalAmount_non_negative" CHECK ("totalAmount" >= 0),
  ADD CONSTRAINT "PurchaseOrder_currentStep_matches_status" CHECK (
    ("status" = 'PENDING' AND "currentStep" IS NOT NULL) OR
    ("status" <> 'PENDING' AND "currentStep" IS NULL)
  );

-- Rejeição sempre registra o motivo.
ALTER TABLE "PurchaseOrderEvent"
  ADD CONSTRAINT "PurchaseOrderEvent_reject_has_reason" CHECK ("type" <> 'REJECTED' OR "reason" IS NOT NULL);
