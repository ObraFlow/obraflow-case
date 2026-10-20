import "dotenv/config";
import { spawnSync } from "node:child_process";
import { getTestDatabaseUrl } from "./test-database";

function run(script: string, arguments_: string[], environment: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, [script, ...arguments_], {
    stdio: "inherit",
    env: environment,
  });
  if (result.error || result.status !== 0) {
    throw new Error("Verificação de integração interrompida; consulte a saída do comando.");
  }
}

try {
  // O guard é executado antes de migrations, conexão ou testes.
  const connectionString = getTestDatabaseUrl(process.env);
  const environment = {
    ...process.env,
    DATABASE_URL: connectionString,
    TEST_DATABASE_GUARDED: "true",
  };
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"], environment);
  run("node_modules/vitest/vitest.mjs", ["run", "--project", "integration"], environment);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha na integração.");
  process.exitCode = 1;
}
