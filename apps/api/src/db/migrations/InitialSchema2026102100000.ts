import type { MigrationInterface, QueryRunner } from "typeorm";

// Initial schema. The rules that must hold even if application code is wrong (membership of
// approvers, one decision per step, a reason on every rejection, non-negative money) are
// enforced here as constraints, not only in the services.
export class InitialSchema2026102100000 implements MigrationInterface {
  name = "InitialSchema2026102100000";

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(64) NOT NULL UNIQUE,
        display_name varchar(120) NOT NULL,
        password_hash text NOT NULL,
        role varchar(5) NOT NULL CHECK (role IN ('ADMIN','USER')),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        deactivated_at timestamptz,
        deactivated_by uuid REFERENCES users(id),
        CONSTRAINT users_username_normalized CHECK (username = lower(username))
      );

      CREATE TABLE user_lifecycle_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        target_user_id uuid NOT NULL REFERENCES users(id),
        actor_user_id uuid REFERENCES users(id),
        actor_kind varchar(6) NOT NULL CHECK (actor_kind IN ('USER','SYSTEM')),
        action varchar(8) NOT NULL CHECK (action IN ('CREATED','DISABLED')),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT user_lifecycle_actor CHECK (
          (actor_kind = 'SYSTEM' AND actor_user_id IS NULL)
          OR (actor_kind = 'USER' AND actor_user_id IS NOT NULL)
        )
      );

      CREATE TABLE projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(150) NOT NULL,
        coa_version integer NOT NULL DEFAULT 0 CHECK (coa_version >= 0),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE project_members (
        project_id uuid NOT NULL REFERENCES projects(id),
        user_id uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (project_id, user_id)
      );
      CREATE INDEX project_members_user_idx ON project_members(user_id);

      CREATE TABLE suppliers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(150) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_by uuid REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        deactivated_at timestamptz,
        deactivated_by uuid REFERENCES users(id)
      );

      -- One row per band of a project's published ladder; position is the approval order.
      CREATE TABLE coa_bands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id),
        position integer NOT NULL CHECK (position >= 0),
        upper_limit numeric(18,2),
        approver_id uuid NOT NULL REFERENCES users(id),
        -- An approver must be a member of the project.
        CONSTRAINT coa_member_fk FOREIGN KEY (project_id, approver_id)
          REFERENCES project_members(project_id, user_id),
        CONSTRAINT coa_limit_nonnegative CHECK (upper_limit IS NULL OR upper_limit >= 0),
        UNIQUE (project_id, position),
        UNIQUE (project_id, approver_id)
      );
      -- Limits are distinct per project, and at most one band has no limit.
      CREATE UNIQUE INDEX coa_finite_limit_unique
        ON coa_bands(project_id, upper_limit) WHERE upper_limit IS NOT NULL;
      CREATE UNIQUE INDEX coa_unbounded_unique
        ON coa_bands(project_id) WHERE upper_limit IS NULL;

      -- Every published version of a ladder, kept for history and for orders to reference.
      CREATE TABLE coa_revisions (
        project_id uuid NOT NULL REFERENCES projects(id),
        version integer NOT NULL CHECK (version >= 1),
        bands jsonb NOT NULL CHECK (jsonb_typeof(bands) = 'array'),
        changed_by_id uuid NOT NULL REFERENCES users(id),
        changed_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (project_id, version)
      );

      CREATE TABLE purchase_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL REFERENCES projects(id),
        supplier_id uuid NOT NULL REFERENCES suppliers(id),
        created_by_id uuid NOT NULL REFERENCES users(id),
        order_date date NOT NULL,
        notes text,
        total numeric(18,2) NOT NULL CHECK (total >= 0),
        status varchar(8) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
        coa_version integer NOT NULL CHECK (coa_version >= 1),
        created_at timestamptz NOT NULL DEFAULT now(),
        -- The order keeps the CoA version it was created under.
        CONSTRAINT po_coa_revision_fk FOREIGN KEY (project_id, coa_version)
          REFERENCES coa_revisions(project_id, version)
      );
      CREATE INDEX po_project_created_idx ON purchase_orders(project_id, created_at DESC, id DESC);
      CREATE INDEX po_status_created_idx ON purchase_orders(status, created_at DESC, id DESC);

      CREATE TABLE purchase_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES purchase_orders(id),
        item_index integer NOT NULL CHECK (item_index >= 0),
        description text NOT NULL CHECK (length(btrim(description)) > 0),
        quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
        unit varchar(32) NOT NULL CHECK (length(btrim(unit)) > 0),
        unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
        line_total numeric(18,2) NOT NULL CHECK (line_total >= 0),
        UNIQUE (order_id, item_index)
      );

      -- The approvers an order needs, frozen at creation from the CoA of that moment.
      CREATE TABLE purchase_order_steps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES purchase_orders(id),
        step_index integer NOT NULL CHECK (step_index >= 0),
        approver_id uuid NOT NULL REFERENCES users(id),
        UNIQUE (order_id, step_index)
      );
      CREATE INDEX po_steps_approver_idx ON purchase_order_steps(approver_id);

      CREATE TABLE approval_decisions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        -- UNIQUE: a step is decided at most once.
        step_id uuid NOT NULL UNIQUE REFERENCES purchase_order_steps(id),
        actor_id uuid NOT NULL REFERENCES users(id),
        decision varchar(8) NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
        reason text,
        decided_at timestamptz NOT NULL DEFAULT now(),
        -- A rejection needs a reason; an approval must not have one.
        CONSTRAINT rejection_reason_required CHECK (
          (decision = 'REJECTED' AND reason IS NOT NULL AND length(btrim(reason)) > 0)
          OR (decision = 'APPROVED' AND reason IS NULL)
        )
      );
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP TABLE approval_decisions;
      DROP TABLE purchase_order_steps;
      DROP TABLE purchase_order_items;
      DROP TABLE purchase_orders;
      DROP TABLE coa_revisions;
      DROP TABLE coa_bands;
      DROP TABLE suppliers;
      DROP TABLE project_members;
      DROP TABLE projects;
      DROP TABLE user_lifecycle_events;
      DROP TABLE users;
    `);
  }
}
