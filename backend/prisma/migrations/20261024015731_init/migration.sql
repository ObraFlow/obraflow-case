-- CreateTable
CREATE TABLE "Obra" (
    "idObra" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Usuario" (
    "idUsuario" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "idFornecedor" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Pedido" (
    "idPedido" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idObra" INTEGER NOT NULL,
    "idFornecedor" INTEGER NOT NULL,
    "dataPedido" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "totalCentavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "etapaAtual" INTEGER,
    CONSTRAINT "Pedido_idObra_fkey" FOREIGN KEY ("idObra") REFERENCES "Obra" ("idObra") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_idFornecedor_fkey" FOREIGN KEY ("idFornecedor") REFERENCES "Fornecedor" ("idFornecedor") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "idItemPedido" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idPedido" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "unidade" TEXT NOT NULL,
    "precoUnitarioCentavos" INTEGER NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    CONSTRAINT "ItemPedido_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido" ("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Regra" (
    "idRegra" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idObra" INTEGER NOT NULL,
    "valorMaximoCentavos" INTEGER,
    CONSTRAINT "Regra_idObra_fkey" FOREIGN KEY ("idObra") REFERENCES "Obra" ("idObra") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegraAprovador" (
    "idRegraAprovador" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idRegra" INTEGER NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    CONSTRAINT "RegraAprovador_idRegra_fkey" FOREIGN KEY ("idRegra") REFERENCES "Regra" ("idRegra") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RegraAprovador_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario" ("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EtapaAprovacao" (
    "idEtapaAprovacao" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idPedido" INTEGER NOT NULL,
    "idUsuario" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO',
    "motivo" TEXT,
    "decididoEm" DATETIME,
    CONSTRAINT "EtapaAprovacao_idPedido_fkey" FOREIGN KEY ("idPedido") REFERENCES "Pedido" ("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EtapaAprovacao_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "Usuario" ("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "RegraAprovador_idRegra_ordem_key" ON "RegraAprovador"("idRegra", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "EtapaAprovacao_idPedido_ordem_key" ON "EtapaAprovacao"("idPedido", "ordem");
