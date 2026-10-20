BEGIN;

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "orderDate" DATE NOT NULL,
    "notes" VARCHAR(2000),
    "total" DECIMAL(11,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentStepPosition" INTEGER,
    "rulesVersion" INTEGER NOT NULL,
    "selectedUpperLimit" DECIMAL(11,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(16) NOT NULL,
    "unitPrice" DECIMAL(9,2) NOT NULL,
    "lineTotal" DECIMAL(11,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStep" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "approverNameSnapshot" VARCHAR(120) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "OrderStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL,
    "reason" VARCHAR(2000),
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIdempotency" (
    "requesterId" UUID NOT NULL,
    "key" UUID NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "contractVersion" VARCHAR(16) NOT NULL DEFAULT 'v1',
    "orderId" UUID,
    "originalResponse" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderIdempotency_pkey" PRIMARY KEY ("requesterId","key")
);

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdAt_id_idx" ON "PurchaseOrder"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_status_createdAt_idx" ON "PurchaseOrder"("projectId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_position_key" ON "OrderItem"("orderId", "position");

-- CreateIndex
CREATE INDEX "OrderStep_userId_orderId_position_idx" ON "OrderStep"("userId", "orderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStep_orderId_position_key" ON "OrderStep"("orderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_stepId_key" ON "Decision"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderIdempotency_orderId_key" ON "OrderIdempotency"("orderId");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStep" ADD CONSTRAINT "OrderStep_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStep" ADD CONSTRAINT "OrderStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OrderStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIdempotency" ADD CONSTRAINT "OrderIdempotency_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIdempotency" ADD CONSTRAINT "OrderIdempotency_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariantes locais expressáveis no banco. Regras entre linhas ficam nos serviços.
ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_total_check" CHECK ("total" BETWEEN 0 AND 100000000.00),
  ADD CONSTRAINT "PurchaseOrder_version_check" CHECK ("version" >= 1 AND "rulesVersion" >= 1),
  ADD CONSTRAINT "PurchaseOrder_state_check" CHECK (("status" = 'PENDING' AND "currentStepPosition" BETWEEN 1 AND 10) OR ("status" <> 'PENDING' AND "currentStepPosition" IS NULL)),
  ADD CONSTRAINT "PurchaseOrder_limit_check" CHECK ("selectedUpperLimit" IS NULL OR "selectedUpperLimit" BETWEEN 0 AND 100000000.00);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_position_check" CHECK ("position" BETWEEN 1 AND 100),
  ADD CONSTRAINT "OrderItem_description_check" CHECK (char_length(btrim("description")) > 0 AND char_length(btrim("unit")) > 0),
  ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" BETWEEN 0.001 AND 1000000.000),
  ADD CONSTRAINT "OrderItem_unitPrice_check" CHECK ("unitPrice" BETWEEN 0 AND 1000000.00),
  ADD CONSTRAINT "OrderItem_lineTotal_check" CHECK ("lineTotal" BETWEEN 0 AND 100000000.00);

ALTER TABLE "OrderStep" ADD CONSTRAINT "OrderStep_position_check" CHECK ("position" BETWEEN 1 AND 10);
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_reason_check"
  CHECK (("outcome" = 'APPROVE' AND "reason" IS NULL) OR ("outcome" = 'REJECT' AND "reason" IS NOT NULL AND char_length(btrim("reason")) > 0));

COMMIT;
