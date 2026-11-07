-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" TEXT,
    "fornecedorId" TEXT,
    "dataPedido" DATETIME,
    "observacoes" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'rascunho',
    "totalCentavos" INTEGER NOT NULL DEFAULT 0,
    "criadoPorId" TEXT NOT NULL,
    "submetidoEm" DATETIME,
    "faixaId" TEXT,
    "faixaLimiteCentavos" INTEGER,
    "faixaSemTeto" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Pedido_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_faixaId_fkey" FOREIGN KEY ("faixaId") REFERENCES "Faixa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("atualizadoEm", "criadoEm", "criadoPorId", "dataPedido", "faixaId", "faixaLimiteCentavos", "faixaSemTeto", "fornecedorId", "id", "obraId", "observacoes", "situacao", "submetidoEm", "totalCentavos") SELECT "atualizadoEm", "criadoEm", "criadoPorId", "dataPedido", "faixaId", "faixaLimiteCentavos", "faixaSemTeto", "fornecedorId", "id", "obraId", "observacoes", "situacao", "submetidoEm", "totalCentavos" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE INDEX "Pedido_situacao_obraId_idx" ON "Pedido"("situacao", "obraId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
