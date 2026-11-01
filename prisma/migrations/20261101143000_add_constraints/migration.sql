-- OrderEvent was removed from the Prisma schema.
DROP TABLE "OrderEvent";
DROP TYPE "EventType";

-- Keep persisted monetary and quantity values valid at the database boundary.
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItem_unitPriceCents_nonnegative" CHECK ("unitPriceCents" >= 0);

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_totalCents_nonnegative" CHECK ("totalCents" >= 0);

CREATE UNIQUE INDEX one_open_rule_per_site
  ON "ApprovalRule"("siteId")
  WHERE "upTo" IS NULL;
