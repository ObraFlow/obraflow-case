-- AlterTable
ALTER TABLE "Obra" ADD COLUMN     "orcamentoCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "origemId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_origemId_key" ON "Pedido"("origemId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

