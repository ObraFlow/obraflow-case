import { EntitySchema } from "typeorm";

export interface Supplier {
  id: string;
  name: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
}

export const SupplierEntity = new EntitySchema<Supplier>({
  name: "Supplier",
  tableName: "suppliers",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "suppliers_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    name: { type: "varchar", length: 150 },
    isActive: { name: "is_active", type: "boolean", default: true },
    createdBy: { name: "created_by", type: "uuid", nullable: true },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
    deactivatedAt: { name: "deactivated_at", type: "timestamptz", nullable: true },
    deactivatedBy: { name: "deactivated_by", type: "uuid", nullable: true },
  },
  foreignKeys: [
    { name: "suppliers_created_by_fkey", target: "User", columnNames: ["createdBy"], referencedColumnNames: ["id"] },
    {
      name: "suppliers_deactivated_by_fkey",
      target: "User",
      columnNames: ["deactivatedBy"],
      referencedColumnNames: ["id"],
    },
  ],
});

export interface SupplierRename {
  id: string;
  supplierId: string;
  actorUserId: string;
  previousName: string;
  name: string;
  createdAt: Date;
}

export const SupplierRenameEntity = new EntitySchema<SupplierRename>({
  name: "SupplierRename",
  tableName: "supplier_renames",
  columns: {
    id: {
      type: "uuid",
      primary: true,
      primaryKeyConstraintName: "supplier_renames_pkey",
      generated: "uuid",
      default: () => "gen_random_uuid()",
    },
    supplierId: { name: "supplier_id", type: "uuid" },
    actorUserId: { name: "actor_user_id", type: "uuid" },
    previousName: { name: "previous_name", type: "varchar", length: 150 },
    name: { type: "varchar", length: 150 },
    createdAt: { name: "created_at", type: "timestamptz", createDate: true, default: () => "now()" },
  },
  indices: [{ name: "supplier_renames_supplier_time_idx", columns: ["supplierId", "createdAt"] }],
  foreignKeys: [
    {
      name: "supplier_renames_supplier_id_fkey",
      target: "Supplier",
      columnNames: ["supplierId"],
      referencedColumnNames: ["id"],
    },
    {
      name: "supplier_renames_actor_user_id_fkey",
      target: "User",
      columnNames: ["actorUserId"],
      referencedColumnNames: ["id"],
    },
  ],
});
