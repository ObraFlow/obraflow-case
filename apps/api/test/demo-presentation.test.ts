import { test } from "node:test";
import assert from "node:assert/strict";
import { displayOrderNotes } from "@dokimos/shared";
import { assertTestDatabase } from "./database-guard.js";

test("demo notes hide only a complete trailing seed marker, including legacy notes", () => {
  assert.match(displayOrderNotes("[obraflow-demo:v1:Obra Norte:pending-first]"), /^Pedido de demonstração\./);
  assert.equal(
    displayOrderNotes("Entregar na portaria.\n[obraflow-demo:v1:project-id:approved]"),
    "Entregar na portaria.",
  );
  for (const note of [
    "Observação do comprador.",
    "[obraflow-demo:v1:Obra Norte:unknown]",
    "Texto [obraflow-demo:v1:Obra Norte:approved] no meio.",
  ])
    assert.equal(displayOrderNotes(note), note);
});

test("test database guard refuses development URLs, missing flags and mismatched names", () => {
  const name = `obraflow_test_${"a".repeat(32)}`;
  for (const environment of [
    {},
    { DATABASE_URL: "postgresql://localhost/obraflow" },
    { DATABASE_URL: "postgresql://localhost/obraflow", OBRAFLOW_TEST_DATABASE: name },
  ]) {
    assert.throws(() => assertTestDatabase(environment), /isolated database/);
  }
  assert.doesNotThrow(() =>
    assertTestDatabase({ DATABASE_URL: `postgresql://localhost/${name}`, OBRAFLOW_TEST_DATABASE: name }),
  );
});
