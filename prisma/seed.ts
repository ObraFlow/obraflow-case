import "dotenv/config";
import { createDatabaseClient } from "../src/lib/database-client";
import { getEnvironment } from "../src/lib/env";
import { seedFoundation } from "../src/modules/registry/seed-foundation";

const database = createDatabaseClient(getEnvironment().DATABASE_URL);

try {
  await seedFoundation(database);
  console.info("Seed concluído: referências e configurações iniciais disponíveis; dados existentes preservados.");
} catch {
  console.error("Falha ao popular referências. Nenhuma alteração desta execução foi confirmada; confira conexão e migrations.");
  process.exitCode = 1;
} finally {
  await database.$disconnect();
}
