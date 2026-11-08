-- Escrita à mão: o drizzle-kit recriava a tabela copiando uma coluna que ainda
-- não existia. No SQLite dá para adicionar a coluna já com o CHECK.
ALTER TABLE `sites` ADD `kind` text DEFAULT 'residential' NOT NULL CONSTRAINT "sites_kind_ck" CHECK("kind" IN ('residential', 'commercial', 'industrial'));
