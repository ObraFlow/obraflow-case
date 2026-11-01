-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Obra" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cargo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraAlcada" (
    "id" SERIAL NOT NULL,
    "obraId" INTEGER NOT NULL,
    "minCents" INTEGER NOT NULL,
    "maxCents" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraAlcada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelRegra" (
    "id" SERIAL NOT NULL,
    "regraId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "NivelRegra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "obraId" INTEGER NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "criadoPorId" INTEGER NOT NULL,
    "dataPedido" DATE NOT NULL,
    "observacoes" TEXT,
    "totalCents" INTEGER NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "stepAtual" INTEGER NOT NULL DEFAULT 0,
    "regraId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" TEXT NOT NULL,
    "precoUnitarioCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprovacaoPedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "aprovadorId" INTEGER NOT NULL,
    "status" "StatusAprovacao" NOT NULL DEFAULT 'PENDENTE',
    "motivo" TEXT,
    "decididoEm" TIMESTAMP(3),

    CONSTRAINT "AprovacaoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cnpj_key" ON "Fornecedor"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "RegraAlcada_obraId_minCents_key" ON "RegraAlcada"("obraId", "minCents");

-- CreateIndex
CREATE UNIQUE INDEX "NivelRegra_regraId_ordem_key" ON "NivelRegra"("regraId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "NivelRegra_regraId_usuarioId_key" ON "NivelRegra"("regraId", "usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_status_idx" ON "Pedido"("status");

-- CreateIndex
CREATE INDEX "Pedido_obraId_idx" ON "Pedido"("obraId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemPedido_pedidoId_ordem_key" ON "ItemPedido"("pedidoId", "ordem");

-- CreateIndex
CREATE INDEX "AprovacaoPedido_aprovadorId_status_idx" ON "AprovacaoPedido"("aprovadorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AprovacaoPedido_pedidoId_ordem_key" ON "AprovacaoPedido"("pedidoId", "ordem");

-- AddForeignKey
ALTER TABLE "RegraAlcada" ADD CONSTRAINT "RegraAlcada_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelRegra" ADD CONSTRAINT "NivelRegra_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraAlcada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelRegra" ADD CONSTRAINT "NivelRegra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "RegraAlcada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprovacaoPedido" ADD CONSTRAINT "AprovacaoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprovacaoPedido" ADD CONSTRAINT "AprovacaoPedido_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
