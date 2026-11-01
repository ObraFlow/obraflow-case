import { EntitySchema } from "typeorm";
import type { CoaBand } from "@dokimos/shared";

export interface CoaBandRecord {
  id: string;
  projectId: string;
  position: number;
  upperLimit: string | null;
  approverId: string;
}
export interface CoaRevisionRecord {
  projectId: string;
  version: number;
  bands: CoaBand[];
  changedById: string;
  changedAt: Date;
}

export const CoaBandEntity = new EntitySchema<CoaBandRecord>({
  name: "CoaBand",
  tableName: "coa_bands",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "coa_bands_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    projectId: { name: "project_id", type: "uuid" },
    position: { type: "int" },
    upperLimit: { name: "upper_limit", type: "numeric", precision: 18, scale: 2, nullable: true },
    approverId: { name: "approver_id", type: "uuid" },
  },
  uniques: [
    // position orders the ladder; an approver may appear only once per project.
    { name: "coa_bands_project_id_position_key", columns: ["projectId", "position"] },
    { name: "coa_bands_project_id_approver_id_key", columns: ["projectId", "approverId"] },
  ],
  // Limits are unique among bounded bands, and at most one band is unlimited (the last).
  indices: [
    {
      name: "coa_finite_limit_unique",
      columns: ["projectId", "upperLimit"],
      unique: true,
      where: "upper_limit IS NOT NULL",
    },
    { name: "coa_unbounded_unique", columns: ["projectId"], unique: true, where: "upper_limit IS NULL" },
  ],
  checks: [
    { name: "coa_bands_position_check", expression: "position >= 0" },
    { name: "coa_limit_nonnegative", expression: "upper_limit IS NULL OR upper_limit >= 0" },
  ],
  foreignKeys: [
    { name: "coa_bands_project_id_fkey", target: "Project", columnNames: ["projectId"], referencedColumnNames: ["id"] },
    { name: "coa_bands_approver_id_fkey", target: "User", columnNames: ["approverId"], referencedColumnNames: ["id"] },
    // An approver must be a member of the project, enforced by the database as well as the service.
    {
      name: "coa_member_fk",
      target: "ProjectMember",
      columnNames: ["projectId", "approverId"],
      referencedColumnNames: ["projectId", "userId"],
    },
  ],
});

export const CoaRevisionEntity = new EntitySchema<CoaRevisionRecord>({
  name: "CoaRevision",
  tableName: "coa_revisions",
  columns: {
    projectId: { name: "project_id", type: "uuid", primary: true, primaryKeyConstraintName: "coa_revisions_pkey" },
    version: { type: "int", primary: true, primaryKeyConstraintName: "coa_revisions_pkey" },
    bands: { type: "jsonb" },
    changedById: { name: "changed_by_id", type: "uuid" },
    changedAt: { name: "changed_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  checks: [
    { name: "coa_revisions_version_check", expression: "version >= 1" },
    { name: "coa_revisions_bands_check", expression: "jsonb_typeof(bands) = 'array'" },
  ],
  foreignKeys: [
    {
      name: "coa_revisions_project_id_fkey",
      target: "Project",
      columnNames: ["projectId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "coa_revisions_changed_by_id_fkey",
      target: "User",
      columnNames: ["changedById"],
      referencedColumnNames: ["id"],
    },
  ],
});
