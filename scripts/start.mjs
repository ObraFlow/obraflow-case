import "dotenv/config";
import process from "node:process";
import console from "node:console";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const standalone = resolve(".next/standalone");
const server = resolve(standalone, "server.js");
if (!existsSync(server)) {
  console.error("Build de produção ausente. Execute npm run build antes de npm run start.");
  process.exitCode = 1;
} else {
  cpSync(resolve(".next/static"), resolve(standalone, ".next/static"), {
    recursive: true,
    force: true,
  });
  cpSync(resolve("public"), resolve(standalone, "public"), { recursive: true, force: true });
  const child = spawn(process.execPath, [server], {
    stdio: "inherit",
    env: {
      ...process.env,
      HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
      PORT: process.env.PORT || "3000",
    },
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", () => {
    console.error("Não foi possível iniciar a aplicação.");
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
