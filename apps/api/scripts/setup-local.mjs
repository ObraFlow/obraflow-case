import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Creates apps/api/.env from .env.example on the first run. An existing .env is never touched.
const target = new URL("../.env", import.meta.url);

const port = process.env.POSTGRES_PORT ?? "6000";
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("POSTGRES_PORT must be a valid TCP port.");
}

// The example file is the template: only the secret placeholder and the port are filled in.
const example = await readFile(new URL("../.env.example", import.meta.url), "utf8");
const content = example
  .replace("replace-with-a-unique-random-secret-of-at-least-32-characters", randomBytes(48).toString("hex"))
  .replace("127.0.0.1:6000/obraflow", `127.0.0.1:${port}/obraflow`);

try {
  // "wx" fails if the file exists, so an existing .env (and its secret) is never overwritten.
  await writeFile(target, content, { flag: "wx", mode: 0o600 });
  console.log("Created apps/api/.env with a random local JWT secret. The file is ignored by Git.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept existing apps/api/.env; credentials and settings were not changed.");
}
