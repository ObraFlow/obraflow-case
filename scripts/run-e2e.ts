import "dotenv/config";
import { spawnSync } from "node:child_process";
import { getTestDatabaseUrl } from "./test-database";

function run(script: string, args: string[], environment: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: environment,
  });
  if (result.error || result.status !== 0)
    throw new Error("Jornada E2E interrompida; consulte a saída acima.");
}

try {
  // Nunca preparar dados ou iniciar servidor no banco de demonstração.
  const connectionString = getTestDatabaseUrl(process.env);
  const environment = {
    ...process.env,
    DATABASE_URL: connectionString,
    LOG_LEVEL: "silent",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  run("node_modules/prisma/build/index.js", ["generate"], environment);
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"], environment);
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"], environment);
  run("node_modules/next/dist/bin/next", ["build", "--webpack"], environment);
  run("node_modules/@playwright/test/cli.js", ["test"], environment);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha nas jornadas E2E.");
  process.exitCode = 1;
}
