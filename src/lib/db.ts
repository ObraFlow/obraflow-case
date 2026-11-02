import "server-only";
import { createDatabaseClient } from "./database-client";
import { getEnvironment } from "./env";

const globalDatabase = globalThis as unknown as {
  obraflowDatabase?: ReturnType<typeof createDatabaseClient>;
};

export function getDatabase() {
  if (!globalDatabase.obraflowDatabase) {
    globalDatabase.obraflowDatabase = createDatabaseClient(getEnvironment().DATABASE_URL);
  }
  return globalDatabase.obraflowDatabase;
}
