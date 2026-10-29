CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    work_id BIGINT NOT NULL REFERENCES works(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    internal_notes VARCHAR(2000),
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    approval_band_id BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX purchase_orders_work_created_idx ON purchase_orders(work_id, created_at DESC);
CREATE INDEX purchase_orders_supplier_idx ON purchase_orders(supplier_id);

CREATE TABLE purchase_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position > 0),
    description VARCHAR(250) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
    UNIQUE (order_id, position)
);

CREATE TABLE purchase_order_approvers (
    order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_users(id),
    position INTEGER NOT NULL CHECK (position > 0),
    approver_name VARCHAR(120) NOT NULL,
    approver_email VARCHAR(254) NOT NULL,
    PRIMARY KEY (order_id, position),
    UNIQUE (order_id, user_id)
);
