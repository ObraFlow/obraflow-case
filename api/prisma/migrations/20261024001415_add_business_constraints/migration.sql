-- Business rules the Prisma schema cannot express

ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "PurchaseOrderItem_unitPrice_non_negative" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "PurchaseOrderItem_position_positive" CHECK ("position" >= 1);

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_total_non_negative" CHECK ("total" >= 0);

ALTER TABLE "ApprovalTier"
  ADD CONSTRAINT "ApprovalTier_maxAmount_positive" CHECK ("maxAmount" IS NULL OR "maxAmount" > 0);

ALTER TABLE "ApprovalTierApprover"
  ADD CONSTRAINT "ApprovalTierApprover_position_positive" CHECK ("position" >= 1);

ALTER TABLE "ApprovalStep"
  ADD CONSTRAINT "ApprovalStep_rejection_requires_reason"
  CHECK ("status" <> 'REJECTED' OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0));

-- Only one "no upper limit" tier per site: treat NULLs as equal 
DROP INDEX "ApprovalTier_siteId_maxAmount_key";
CREATE UNIQUE INDEX "ApprovalTier_siteId_maxAmount_key"
  ON "ApprovalTier"("siteId", "maxAmount") NULLS NOT DISTINCT;