import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Client } from "pg";

// npm test                     the quick tier: api, unit and e2e (real API, database and browser journey)
// npm test -- all              everything: the quick tier plus the browser regression suite (web)
// npm test -- api              runs one suite (api, unit, web or e2e)
// npm test -- web <file...>    anything after the suite name goes to that suite's test command
//
// Every run uses its own throwaway database, created from the configured PostgreSQL server,
// migrated and seeded, then dropped. The development database is never touched.
const root = fileURLToPath(new URL("../", import.meta.url));
config({ path: fileURLToPath(new URL("../apps/api/.env", import.meta.url)) });

// suite name -> [npm script, workspace]
const suites = {
  api: ["test", "@dokimos/api"],
  unit: ["test:unit", "@dokimos/web"],
  e2e: ["test:acceptance", "@dokimos/web"],
  web: ["test", "@dokimos/web"],
};
const quick = ["api", "unit", "e2e"];

const [requested, ...extraArgs] = process.argv.slice(2);
assert.ok(
  requested === undefined || requested === "all" || requested in suites,
  "Choose api, unit, e2e or web (or all; with no choice, the quick tier api, unit and e2e runs).",
);
const selected = requested === undefined ? quick : requested === "all" ? Object.keys(suites) : [requested];

const npm = process.env.npm_execpath;
assert.ok(npm, "Run this with npm test.");

// The configured database is only the place to connect from; the tests run in `name`.
const source = new URL(
  process.env.DATABASE_URL ??
    `postgresql://obraflow:obraflow@127.0.0.1:${process.env.POSTGRES_PORT ?? "6000"}/obraflow`,
);
const name = `obraflow_test_${randomUUID().replaceAll("-", "")}`;
assert.match(name, /^obraflow_test_[a-f0-9]{32}$/);

const target = new URL(source);
target.pathname = `/${name}`;

const env = {
  ...process.env,
  DATABASE_URL: target.toString(),
  OBRAFLOW_TEST_DATABASE: name,
  NODE_ENV: "test",
  JWT_SECRET: process.env.JWT_SECRET ?? randomBytes(48).toString("hex"),
};

// run: executes one root npm script (optionally in a workspace) against the test database
// and returns whether it succeeded.
function run(script, workspace, args = []) {
  const command = [
    npm,
    "run",
    script,
    ...(workspace ? ["--workspace", workspace] : []),
    ...(args.length ? ["--", ...args] : []),
  ];
  const result = spawnSync(process.execPath, command, { cwd: root, env, stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  return result.status === 0;
}

const admin = new Client({ connectionString: source.toString() });
const results = {};
let created = false;

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
  created = true;
  console.log(`Tests: created ${name}; the development database is unchanged.`);

  // db:seed builds the shared package the suites import, applies the migrations, then seeds.
  assert.ok(run("db:seed", "@dokimos/api"), "db:seed failed.");

  // A failing suite does not stop the others, so one run shows every failure.
  for (const key of selected) {
    const [script, workspace] = suites[key];
    results[key] = run(script, workspace, selected.length === 1 ? extraArgs : []);
  }

  console.log(
    `\n${Object.entries(results)
      .map(([key, passed]) => `${key}: ${passed ? "passed" : "FAILED"}`)
      .join("   ")}`,
  );
  if (Object.values(results).includes(false)) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Test run failed.");
  process.exitCode = 1;
} finally {
  try {
    if (created) {
      assert.match(name, /^obraflow_test_[a-f0-9]{32}$/);
      await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      console.log(`Tests: removed ${name}.`);
    }
  } finally {
    await admin.end();
  }
}
