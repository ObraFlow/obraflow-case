import type { AuditProjectDetails, ProjectAuditEventType } from "@dokimos/shared";
import { EntitySchema } from "typeorm";

export interface Project {
  id: string;
  name: string;
  coaVersion: number;
  isActive: boolean;
  createdAt: Date;
}

export const ProjectEntity = new EntitySchema<Project>({
  name: "Project",
  tableName: "projects",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "projects_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    name: { type: "varchar", length: 150 },
    isActive: { name: "is_active", type: "boolean", default: true },
    coaVersion: { name: "coa_version", type: "int", default: 0 },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  checks: [{ name: "projects_coa_version_check", expression: "coa_version >= 0" }],
});

export interface ProjectMemberRecord {
  projectId: string;
  userId: string;
  createdAt: Date;
}

export const ProjectMemberEntity = new EntitySchema<ProjectMemberRecord>({
  name: "ProjectMember",
  tableName: "project_members",
  columns: {
    projectId: { name: "project_id", type: "uuid", primary: true, primaryKeyConstraintName: "project_members_pkey" },
    userId: { name: "user_id", type: "uuid", primary: true, primaryKeyConstraintName: "project_members_pkey" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  indices: [{ name: "project_members_user_idx", columns: ["userId"] }],
  foreignKeys: [
    {
      name: "project_members_project_id_fkey",
      target: "Project",
      columnNames: ["projectId"],
      referencedColumnNames: ["id"],
    },
    { name: "project_members_user_id_fkey", target: "User", columnNames: ["userId"], referencedColumnNames: ["id"] },
  ],
});

export interface ProjectLifecycleEvent {
  id: string;
  projectId: string;
  actorUserId: string | null;
  actorKind: "USER" | "SYSTEM";
  action: ProjectAuditEventType;
  details: AuditProjectDetails;
  createdAt: Date;
}
export const ProjectLifecycleEventEntity = new EntitySchema<ProjectLifecycleEvent>({
  name: "ProjectLifecycleEvent",
  tableName: "project_lifecycle_events",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "project_lifecycle_events_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    projectId: { name: "project_id", type: "uuid" },
    actorUserId: { name: "actor_user_id", type: "uuid", nullable: true },
    actorKind: { name: "actor_kind", type: "varchar", length: 6 },
    action: { type: "varchar", length: 32 },
    details: { type: "jsonb" },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  checks: [
    // SYSTEM events (the seed) have no acting user; USER events always do.
    {
      name: "project_lifecycle_actor",
      expression:
        "(actor_kind = 'SYSTEM' AND actor_user_id IS NULL) OR (actor_kind = 'USER' AND actor_user_id IS NOT NULL)",
    },
    {
      name: "project_lifecycle_action",
      expression:
        "action IN ('PROJECT_CREATED','PROJECT_RENAMED','PROJECT_ARCHIVED','PROJECT_REACTIVATED','PROJECT_MEMBER_ADDED','PROJECT_MEMBER_REMOVED')",
    },
  ],
  indices: [{ name: "project_lifecycle_project_time_idx", columns: ["projectId", "createdAt"] }],
  foreignKeys: [
    {
      name: "project_lifecycle_project_fkey",
      target: "Project",
      columnNames: ["projectId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "project_lifecycle_actor_fkey",
      target: "User",
      columnNames: ["actorUserId"],
      referencedColumnNames: ["id"],
    },
  ],
});
