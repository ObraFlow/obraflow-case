-- ===========================================================================
-- ObraFlow / Dokimos - schema base
-- Valores monetarios em NUMERIC(19,4). Datas em TIMESTAMPTZ (UTC).
-- ===========================================================================

CREATE TABLE obra (
    id             UUID PRIMARY KEY,
    codigo         VARCHAR(20)  NOT NULL,
    nome           VARCHAR(120) NOT NULL,
    endereco       VARCHAR(255),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ATIVA',
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_obra_codigo UNIQUE (codigo),
    CONSTRAINT ck_obra_status CHECK (status IN ('ATIVA', 'INATIVA'))
);

CREATE TABLE usuario (
    id             UUID PRIMARY KEY,
    nome           VARCHAR(120) NOT NULL,
    email          VARCHAR(180) NOT NULL,
    senha_hash     VARCHAR(100) NOT NULL,
    cargo          VARCHAR(80),
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuario_email UNIQUE (email)
);

CREATE TABLE usuario_papel (
    usuario_id UUID    NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    papel      VARCHAR(30) NOT NULL,
    CONSTRAINT pk_usuario_papel PRIMARY KEY (usuario_id, papel),
    CONSTRAINT ck_usuario_papel CHECK (papel IN ('ADMIN', 'COMPRADOR', 'APROVADOR'))
);

CREATE TABLE fornecedor (
    id             UUID PRIMARY KEY,
    nome           VARCHAR(160) NOT NULL,
    documento      VARCHAR(20),
    email          VARCHAR(180),
    telefone       VARCHAR(30),
    ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Nivel (faixa) de alcada: faixa de valores [limite_inferior, limite_superior).
-- limite_superior NULL = faixa sem teto. Sobreposicao e' bloqueada em V2.
CREATE TABLE nivel_alcada (
    id               UUID PRIMARY KEY,
    obra_id          UUID NOT NULL REFERENCES obra (id) ON DELETE CASCADE,
    limite_inferior  NUMERIC(19,4) NOT NULL DEFAULT 0,
    limite_superior   NUMERIC(19,4),
    descricao        VARCHAR(120),
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_nivel_limite_inferior CHECK (limite_inferior >= 0),
    CONSTRAINT ck_nivel_limites CHECK (limite_superior IS NULL OR limite_superior > limite_inferior)
);
CREATE INDEX ix_nivel_alcada_obra ON nivel_alcada (obra_id);

CREATE TABLE aprovador_nivel (
    id              UUID PRIMARY KEY,
    nivel_alcada_id UUID NOT NULL REFERENCES nivel_alcada (id) ON DELETE CASCADE,
    usuario_id      UUID NOT NULL REFERENCES usuario (id),
    ordem           INT  NOT NULL,
    CONSTRAINT uq_aprovador_nivel_ordem UNIQUE (nivel_alcada_id, ordem),
    CONSTRAINT uq_aprovador_nivel_usuario UNIQUE (nivel_alcada_id, usuario_id),
    CONSTRAINT ck_aprovador_nivel_ordem CHECK (ordem >= 1)
);

CREATE SEQUENCE seq_pedido_numero START 1 INCREMENT BY 1;

CREATE TABLE pedido_compra (
    id               UUID PRIMARY KEY,
    numero           VARCHAR(20)  NOT NULL,
    obra_id          UUID         NOT NULL REFERENCES obra (id),
    fornecedor_id    UUID         NOT NULL REFERENCES fornecedor (id),
    data_pedido      DATE         NOT NULL,
    observacoes      VARCHAR(1000),
    valor_total      NUMERIC(19,4) NOT NULL,
    situacao         VARCHAR(20)  NOT NULL,
    etapa_atual      INT          NOT NULL DEFAULT 1,
    nivel_alcada_id  UUID         REFERENCES nivel_alcada (id),
    solicitante_id   UUID         REFERENCES usuario (id),
    versao           BIGINT       NOT NULL DEFAULT 0,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_pedido_compra_numero UNIQUE (numero),
    CONSTRAINT ck_pedido_situacao CHECK (situacao IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
    CONSTRAINT ck_pedido_etapa_atual CHECK (etapa_atual >= 1),
    CONSTRAINT ck_pedido_valor_total CHECK (valor_total >= 0)
);
CREATE INDEX ix_pedido_situacao ON pedido_compra (situacao);
CREATE INDEX ix_pedido_obra ON pedido_compra (obra_id);
CREATE INDEX ix_pedido_fornecedor ON pedido_compra (fornecedor_id);

CREATE TABLE pedido_compra_item (
    id             UUID PRIMARY KEY,
    pedido_id      UUID NOT NULL REFERENCES pedido_compra (id) ON DELETE CASCADE,
    descricao      VARCHAR(255) NOT NULL,
    quantidade     NUMERIC(19,4) NOT NULL,
    unidade        VARCHAR(10)  NOT NULL,
    preco_unitario NUMERIC(19,4) NOT NULL,
    total          NUMERIC(19,4) NOT NULL,
    ordem          INT NOT NULL,
    CONSTRAINT ck_item_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_item_preco CHECK (preco_unitario >= 0),
    CONSTRAINT ck_item_total CHECK (total >= 0),
    CONSTRAINT ck_item_ordem CHECK (ordem >= 1),
    -- o total do item e' sempre o produto exato quantidade x preco unitario (4 casas)
    CONSTRAINT ck_item_total_calculo CHECK (total = round(quantidade * preco_unitario, 4))
);
CREATE INDEX ix_pedido_item_pedido ON pedido_compra_item (pedido_id);

-- Snapshot da cadeia de aprovacao do pedido + historico de decisoes.
CREATE TABLE etapa_alcada (
    id          UUID PRIMARY KEY,
    pedido_id   UUID NOT NULL REFERENCES pedido_compra (id) ON DELETE CASCADE,
    usuario_id  UUID NOT NULL REFERENCES usuario (id),
    ordem       INT  NOT NULL,
    situacao    VARCHAR(20) NOT NULL,
    motivo      VARCHAR(500),
    decidido_em TIMESTAMPTZ,
    CONSTRAINT uq_etapa_ordem UNIQUE (pedido_id, ordem),
    CONSTRAINT uq_etapa_usuario UNIQUE (pedido_id, usuario_id),
    CONSTRAINT ck_etapa_ordem CHECK (ordem >= 1),
    CONSTRAINT ck_etapa_situacao CHECK (situacao IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
    -- motivo e' OBRIGATORIO em caso de rejeicao, garantido pelo proprio banco
    CONSTRAINT ck_etapa_motivo CHECK (situacao <> 'REJEITADO' OR (motivo IS NOT NULL AND length(btrim(motivo)) > 0))
);
CREATE INDEX ix_etapa_pedido ON etapa_alcada (pedido_id);
