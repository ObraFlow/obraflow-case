ALTER TABLE purchase_orders
    ADD COLUMN current_approver_position INTEGER DEFAULT 1,
    ADD CONSTRAINT purchase_orders_current_approver_position_positive
        CHECK (current_approver_position IS NULL OR current_approver_position > 0),
    ADD CONSTRAINT purchase_orders_status_current_approver_consistency
        CHECK ((status = 'PENDING' AND current_approver_position IS NOT NULL)
            OR (status IN ('APPROVED','REJECTED') AND current_approver_position IS NULL));

CREATE TABLE purchase_order_decisions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    approver_name VARCHAR(120) NOT NULL,
    approver_email VARCHAR(254) NOT NULL,
    outcome VARCHAR(16) NOT NULL CHECK (outcome IN ('APPROVED','REJECTED')),
    reason VARCHAR(1000),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT purchase_order_decisions_order_position_unique UNIQUE (order_id, position),
    CONSTRAINT purchase_order_decisions_rejection_reason CHECK (
        (outcome = 'REJECTED' AND reason IS NOT NULL AND length(trim(reason)) > 0)
        OR (outcome = 'APPROVED' AND reason IS NULL)
    ),
    CONSTRAINT purchase_order_decisions_approver_fk FOREIGN KEY (order_id, user_id)
        REFERENCES purchase_order_approvers(order_id, user_id)
);

CREATE INDEX purchase_order_decisions_order_time_idx
    ON purchase_order_decisions(order_id, decided_at, id);
