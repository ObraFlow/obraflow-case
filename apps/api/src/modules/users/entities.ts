import { EntitySchema } from "typeorm";
import type { Role } from "@dokimos/shared";

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
}

export const UserEntity = new EntitySchema<User>({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "users_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    username: { type: "varchar", length: 64 },
    displayName: { name: "display_name", type: "varchar", length: 120 },
    passwordHash: { name: "password_hash", type: "text" },
    role: { type: "varchar", length: 5 },
    isActive: { name: "is_active", type: "boolean", default: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
    deactivatedAt: { name: "deactivated_at", type: "timestamptz", nullable: true },
    deactivatedBy: { name: "deactivated_by", type: "uuid", nullable: true },
  },
  uniques: [{ name: "users_username_key", columns: ["username"] }],
  checks: [
    { name: "users_role_check", expression: "role IN ('ADMIN','USER')" },
    // Usernames are stored lowercase so lookups and uniqueness are case-insensitive.
    { name: "users_username_normalized", expression: "username = lower(username)" },
  ],
  foreignKeys: [
    {
      name: "users_deactivated_by_fkey",
      target: "User",
      columnNames: ["deactivatedBy"],
      referencedColumnNames: ["id"],
    },
  ],
});

export interface UserLifecycleEvent {
  id: string;
  targetUserId: string;
  actorUserId: string | null;
  actorKind: "USER" | "SYSTEM";
  action: "CREATED" | "DISABLED";
  createdAt: Date;
}

export const UserLifecycleEventEntity = new EntitySchema<UserLifecycleEvent>({
  name: "UserLifecycleEvent",
  tableName: "user_lifecycle_events",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "user_lifecycle_events_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    targetUserId: { name: "target_user_id", type: "uuid" },
    actorUserId: { name: "actor_user_id", type: "uuid", nullable: true },
    actorKind: { name: "actor_kind", type: "varchar", length: 6 },
    action: { type: "varchar", length: 8 },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  checks: [
    { name: "user_lifecycle_events_actor_kind_check", expression: "actor_kind IN ('USER','SYSTEM')" },
    { name: "user_lifecycle_events_action_check", expression: "action IN ('CREATED','DISABLED')" },
    // SYSTEM events (the seed) have no acting user; USER events always do.
    {
      name: "user_lifecycle_actor",
      expression:
        "(actor_kind = 'SYSTEM' AND actor_user_id IS NULL) OR (actor_kind = 'USER' AND actor_user_id IS NOT NULL)",
    },
  ],
  foreignKeys: [
    {
      name: "user_lifecycle_events_target_user_id_fkey",
      target: "User",
      columnNames: ["targetUserId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "user_lifecycle_events_actor_user_id_fkey",
      target: "User",
      columnNames: ["actorUserId"],
      referencedColumnNames: ["id"],
    },
  ],
});
