import type { MigrationInterface, QueryRunner } from "typeorm";

// One row per supplier rename, so the audit trail can show what a supplier was called when
// each event happened. Only renames are stored here; creation and deactivation are still
// read from the supplier row itself.
export class SupplierRenames2026103000002 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE supplier_renames (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      supplier_id uuid NOT NULL,
      actor_user_id uuid NOT NULL,
      previous_name varchar(150) NOT NULL,
      name varchar(150) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT supplier_renames_pkey PRIMARY KEY (id),
      CONSTRAINT supplier_renames_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      CONSTRAINT supplier_renames_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES users(id)
    )`);
    await runner.query("CREATE INDEX supplier_renames_supplier_time_idx ON supplier_renames (supplier_id, created_at)");
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query("DROP TABLE supplier_renames");
  }
}
