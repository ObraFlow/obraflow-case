-- ===========================================================================
-- Integridade referencial forte das faixas de alcada, garantida pelo Postgres.
-- ===========================================================================

-- btree_gist habilita o operador de igualdade de UUID dentro de um indice GIST,
-- permitindo uma constraint EXCLUDE que impede faixas sobrepostas por obra.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE nivel_alcada
    ADD CONSTRAINT ex_nivel_alcada_sem_sobreposicao
    EXCLUDE USING gist (
        obra_id WITH =,
        numrange(limite_inferior, limite_superior, '[)') WITH &&
    );

-- O total do pedido deve ser sempre a soma dos totais dos itens.
-- Constraint trigger DEFERRED: a verificacao roda no COMMIT, depois que todos
-- os itens do agregado foram gravados.
CREATE OR REPLACE FUNCTION fn_chk_pedido_total() RETURNS trigger AS $$
DECLARE
    v_pedido_id UUID;
    v_total     NUMERIC(19,4);
BEGIN
    v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);

    SELECT COALESCE(SUM(total), 0)
      INTO v_total
      FROM pedido_compra_item
     WHERE pedido_id = v_pedido_id;

    IF EXISTS (
        SELECT 1 FROM pedido_compra
         WHERE id = v_pedido_id
           AND valor_total <> v_total
    ) THEN
        RAISE EXCEPTION 'valor_total do pedido % diverge da soma dos itens (%)', v_pedido_id, v_total;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_chk_pedido_total
AFTER INSERT OR UPDATE OR DELETE ON pedido_compra_item
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_chk_pedido_total();
