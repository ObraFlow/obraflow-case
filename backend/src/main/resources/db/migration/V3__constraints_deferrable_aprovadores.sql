-- Recria as constraints unicas do cadeia de aprovadores como DEFERRABLE INITIALLY DEFERRED.
--
-- Motivo: a sincronizacao da cadeia reaproveita as linhas existentes e atualiza
-- usuario_id/ordem in-place (NivelAlcadaRepositoryAdapter#sincronizarAprovadores).
-- Ao reordenar aprovadores (ex.: Amanda(1)/Joao(2) -> Joao(1)/Amanda(2)) os UPDATEs
-- transitam por estados intermediarios que violariam as restricoes UNIQUE imediatas
-- (mesmo usuario em duas linhas durante o flush da transacao).
-- Com DEFERRABLE INITIALLY DEFERRED a verificacao ocorre no COMMIT, preservando a
-- integridade dos dados e permitindo a reordenacao atomica da cadeia.

ALTER TABLE aprovador_nivel DROP CONSTRAINT uq_aprovador_nivel_ordem;
ALTER TABLE aprovador_nivel
    ADD CONSTRAINT uq_aprovador_nivel_ordem UNIQUE (nivel_alcada_id, ordem)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE aprovador_nivel DROP CONSTRAINT uq_aprovador_nivel_usuario;
ALTER TABLE aprovador_nivel
    ADD CONSTRAINT uq_aprovador_nivel_usuario UNIQUE (nivel_alcada_id, usuario_id)
    DEFERRABLE INITIALLY DEFERRED;
