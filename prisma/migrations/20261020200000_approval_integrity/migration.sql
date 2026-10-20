-- SQL CHECK aceita NULL; exigir explicitamente uma posição no estado pendente.
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_state_check";
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_state_check"
  CHECK (("status" = 'PENDING' AND "currentStepPosition" IS NOT NULL AND "currentStepPosition" BETWEEN 1 AND 10)
    OR ("status" <> 'PENDING' AND "currentStepPosition" IS NULL));
