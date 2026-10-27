-- DropIndex
DROP INDEX "PurchaseOrderEvent_orderId_createdAt_idx";

-- AlterTable
ALTER TABLE "PurchaseOrderEvent" ADD COLUMN     "sequence" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderEvent_sequence_key" ON "PurchaseOrderEvent"("sequence");

-- CreateIndex
CREATE INDEX "PurchaseOrderEvent_orderId_sequence_idx" ON "PurchaseOrderEvent"("orderId", "sequence");

