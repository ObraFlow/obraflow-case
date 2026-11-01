import "dotenv/config";
import { buildApp } from "./app.js";
import { dataSource } from "./db/data-source.js";

async function start(): Promise<void> {
  await dataSource.initialize();

  // The API never migrates on its own: the schema is changed only by `npm run db:migrate`.
  const pending = await dataSource.showMigrations();
  if (pending) {
    throw new Error("Pending database migrations. Run npm run db:migrate before starting the API.");
  }

  const app = await buildApp();

  // Stop accepting requests and close sockets first, then release the database pool.
  const shutdown = async () => {
    try {
      await app.close();
    } finally {
      if (dataSource.isInitialized) await dataSource.destroy();
    }
  };
  const onSignal = () => {
    shutdown().catch((error: unknown) => {
      console.error("Dokimos API shutdown failed:", error);
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "4000"),
  });
}

start().catch(async (error: unknown) => {
  // Never log credentials or secret values.
  console.error("Dokimos API startup failed:", error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
