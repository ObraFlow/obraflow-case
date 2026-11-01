import { DEMO_SUPPLIERS } from "@dokimos/shared";
import { SupplierEntity } from "../../modules/suppliers/entities.js";
import { dataSource } from "../data-source.js";

// renameLegacySupplier: true if a supplier with the old demo name was renamed.
async function renameLegacySupplier(legacyName: string, name: string): Promise<boolean> {
  const suppliers = dataSource.getRepository(SupplierEntity);
  const legacy = await suppliers.findOneBy({ name: legacyName });
  if (!legacy) return false;
  // A conditional update, not a save of the stale entity: a concurrent deactivation wins.
  const result = await suppliers.update({ id: legacy.id, name: legacyName }, { name });
  return Boolean(result.affected);
}

// seedSuppliers: ensures each demo supplier exists, renaming legacy-named ones.
export async function seedSuppliers(adminId: string | null): Promise<void> {
  const suppliers = dataSource.getRepository(SupplierEntity);
  for (const { name, legacyName } of DEMO_SUPPLIERS) {
    if (await suppliers.existsBy({ name })) continue;
    if (legacyName && (await renameLegacySupplier(legacyName, name))) continue;
    await suppliers.save(suppliers.create({ name, createdBy: adminId, isActive: true }));
  }
}
