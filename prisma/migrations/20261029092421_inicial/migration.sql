-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Faixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "obraId" TEXT NOT NULL,
    "limiteCentavos" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Faixa_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FaixaAprovador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faixaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "FaixaAprovador_faixaId_fkey" FOREIGN KEY ("faixaId") REFERENCES "Faixa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FaixaAprovador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedidoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidadeMilesimos" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,
    "precoUnitarioCentavos" INTEGER NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedidoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "situacao" TEXT NOT NULL DEFAULT 'pendente',
    "decididoEm" DATETIME,
    "motivo" TEXT,
    CONSTRAINT "Etapa_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Etapa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Faixa_obraId_limiteCentavos_idx" ON "Faixa"("obraId", "limiteCentavos");

-- CreateIndex
CREATE UNIQUE INDEX "FaixaAprovador_faixaId_ordem_key" ON "FaixaAprovador"("faixaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "FaixaAprovador_faixaId_usuarioId_key" ON "FaixaAprovador"("faixaId", "usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_situacao_obraId_idx" ON "Pedido"("situacao", "obraId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPedido_pedidoId_ordem_key" ON "ItemPedido"("pedidoId", "ordem");

-- CreateIndex
CREATE INDEX "Etapa_usuarioId_situacao_idx" ON "Etapa"("usuarioId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "Etapa_pedidoId_ordem_key" ON "Etapa"("pedidoId", "ordem");
