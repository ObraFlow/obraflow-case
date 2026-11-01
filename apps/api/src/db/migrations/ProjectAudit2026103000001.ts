import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectAudit2026103000001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE project_lifecycle_events (
      id uuid NOT NULL DEFAULT gen_random_uuid(), project_id uuid NOT NULL,
      actor_user_id uuid, actor_kind varchar(6) NOT NULL, action varchar(32) NOT NULL,
      details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT project_lifecycle_events_pkey PRIMARY KEY (id),
      CONSTRAINT project_lifecycle_project_fkey FOREIGN KEY (project_id) REFERENCES projects(id),
      CONSTRAINT project_lifecycle_actor_fkey FOREIGN KEY (actor_user_id) REFERENCES users(id),
      CONSTRAINT project_lifecycle_actor CHECK ((actor_kind = 'SYSTEM' AND actor_user_id IS NULL) OR (actor_kind = 'USER' AND actor_user_id IS NOT NULL)),
      CONSTRAINT project_lifecycle_action CHECK (action IN ('PROJECT_CREATED','PROJECT_RENAMED','PROJECT_ARCHIVED','PROJECT_REACTIVATED','PROJECT_MEMBER_ADDED','PROJECT_MEMBER_REMOVED'))
    )`);
    await runner.query(
      "CREATE INDEX project_lifecycle_project_time_idx ON project_lifecycle_events (project_id, created_at)",
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query("DROP TABLE project_lifecycle_events");
  }
}
