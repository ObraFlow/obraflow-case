-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItemPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedidoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidadeMilesimos" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "precoUnitarioCentavos" INTEGER,
    "totalCentavos" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ItemPedido" ("descricao", "id", "ordem", "pedidoId", "precoUnitarioCentavos", "quantidadeMilesimos", "totalCentavos", "unidade") SELECT "descricao", "id", "ordem", "pedidoId", "precoUnitarioCentavos", "quantidadeMilesimos", "totalCentavos", "unidade" FROM "ItemPedido";
DROP TABLE "ItemPedido";
ALTER TABLE "new_ItemPedido" RENAME TO "ItemPedido";
CREATE UNIQUE INDEX "ItemPedido_pedidoId_ordem_key" ON "ItemPedido"("pedidoId", "ordem");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
