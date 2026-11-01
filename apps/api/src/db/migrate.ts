import { dataSource } from "./data-source.js";

try {
  await dataSource.initialize();
  const migrations = await dataSource.runMigrations();
  console.log(`Applied ${migrations.length} migrations.`);
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
