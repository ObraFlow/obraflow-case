import "dotenv/config";
import { createDatabaseClient } from "../src/lib/database-client";
import { getEnvironment } from "../src/lib/env";
import { seedFoundation } from "../src/modules/registry/seed-foundation";
import { seedDemoOrders } from "../src/modules/orders/seed-demo";

const database = createDatabaseClient(getEnvironment().DATABASE_URL);

try {
  await seedFoundation(database);
  await seedDemoOrders(database);
  console.info(
    "Seed concluído: referências, alçadas e quatro cenários de pedidos disponíveis; dados existentes preservados.",
  );
} catch {
  console.error(
    "Falha ao preparar demonstração. Operações já concluídas foram preservadas; confira conexão e migrations antes de tentar novamente.",
  );
  process.exitCode = 1;
} finally {
  await database.$disconnect();
}
