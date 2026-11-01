import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectLifecycle2026103000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE projects ADD COLUMN is_active boolean NOT NULL DEFAULT true");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE projects DROP COLUMN is_active");
  }
}
