import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// npm run review          builds and starts the whole app in Docker (own database, migrated and seeded)
// npm run review -- down  stops it; the data volume stays (add `-v` to docker compose down to remove it)
//
// A thin wrapper over compose.review.yaml, which works without Node as well:
//   docker compose -f compose.review.yaml up --build
const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] ?? "up";
const port = process.env.REVIEW_PORT ?? "8080";

function compose(...args) {
  const result = spawnSync("docker", ["compose", "-f", "compose.review.yaml", ...args], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker compose ${args[0]} failed (${result.status ?? result.signal}).`);
}

try {
  if (!["up", "down"].includes(mode)) throw new Error("Use npm run review, or npm run review -- down.");
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("REVIEW_PORT must be a valid TCP port.");
  if (mode === "down") compose("down");
  else {
    compose("up", "-d", "--build", "--wait");
    console.log(`Review ready: http://localhost:${port}. Stop with npm run review -- down.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Review failed.");
  process.exitCode = 1;
}
