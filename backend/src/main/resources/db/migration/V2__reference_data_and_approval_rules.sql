CREATE TABLE works (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    code VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    tax_id VARCHAR(32) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approval_bands (
    id BIGSERIAL PRIMARY KEY,
    work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    min_amount NUMERIC(14,2) NOT NULL CHECK (min_amount >= 0),
    max_amount NUMERIC(14,2),
    position INTEGER NOT NULL CHECK (position > 0),
    CHECK (max_amount IS NULL OR max_amount > min_amount),
    UNIQUE (work_id, position)
);

CREATE TABLE approval_band_approvers (
    band_id BIGINT NOT NULL REFERENCES approval_bands(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_users(id),
    position INTEGER NOT NULL CHECK (position > 0),
    PRIMARY KEY (band_id, position),
    UNIQUE (band_id, user_id)
);

CREATE INDEX approval_bands_work_amount_idx ON approval_bands(work_id, min_amount, max_amount);
