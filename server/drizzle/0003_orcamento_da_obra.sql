-- Orçamento de compras por obra, base do painel "gasto x orçamento".
-- Escrita à mão pelo mesmo motivo da 0002: ALTER TABLE com CHECK, sem recriar a tabela.
ALTER TABLE `sites` ADD `budget_cents` integer DEFAULT 0 NOT NULL CONSTRAINT "sites_budget_ck" CHECK("budget_cents" >= 0);
