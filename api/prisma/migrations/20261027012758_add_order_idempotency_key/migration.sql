-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "requestHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_requesterId_idempotencyKey_key" ON "PurchaseOrder"("requesterId", "idempotencyKey");

