import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("local setup matches Compose's default, supports overrides and never replaces existing settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokimos-setup-"));
  try {
    const scripts = join(root, "scripts");
    await mkdir(scripts);
    await copyFile(new URL("../scripts/setup-local.mjs", import.meta.url), join(scripts, "setup-local.mjs"));
    await copyFile(new URL("../.env.example", import.meta.url), join(root, ".env.example"));
    const compose = await readFile(new URL("../../../compose.yaml", import.meta.url), "utf8");
    assert.ok(compose.includes("127.0.0.1:${POSTGRES_PORT:-6000}:5432"));
    const run = (port?: string) => {
      const env = { ...process.env };
      delete env.POSTGRES_PORT;
      if (port !== undefined) env.POSTGRES_PORT = port;
      const result = spawnSync(process.execPath, [join(scripts, "setup-local.mjs")], { env, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    };
    run();
    const original = await readFile(join(root, ".env"));
    assert.match(original.toString(), /DATABASE_URL=postgresql:\/\/obraflow:obraflow@127\.0\.0\.1:6000\/obraflow/);
    assert.match(original.toString(), /JWT_SECRET=[a-f0-9]{96}/);
    run("55439");
    assert.deepEqual(await readFile(join(root, ".env")), original);
    await rm(join(root, ".env"));
    run("55439");
    const alternate = await readFile(join(root, ".env"));
    assert.match(alternate.toString(), /127\.0\.0\.1:55439\/obraflow/);
    assert.notEqual(
      alternate.toString().match(/JWT_SECRET=(.*)/)![1],
      original.toString().match(/JWT_SECRET=(.*)/)![1],
    );
    run();
    assert.deepEqual(await readFile(join(root, ".env")), alternate);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
