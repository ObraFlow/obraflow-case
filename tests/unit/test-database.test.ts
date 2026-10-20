import { describe, expect, it } from "vitest";
import { getTestDatabaseUrl } from "../../scripts/test-database";

const development = "postgresql://user:password@localhost:5432/obraflow";

describe("isolamento do banco de integração", () => {
  it("exige TEST_DATABASE_URL e DATABASE_URL antes de conectar", () => {
    expect(() => getTestDatabaseUrl({ DATABASE_URL: development })).toThrow("Defina TEST_DATABASE_URL");
    expect(() => getTestDatabaseUrl({ TEST_DATABASE_URL: `${development}_test` })).toThrow("Defina DATABASE_URL");
  });

  it("recusa banco que não termine em _test", () => {
    expect(() => getTestDatabaseUrl({ DATABASE_URL: development, TEST_DATABASE_URL: development })).toThrow("terminar em _test");
  });

  it.each([
    "postgres://other:password@127.0.0.1/obraflow_test?schema=other",
    "postgresql://other:password@[::1]:5432/obraflow_test",
  ])("recusa a mesma identidade de banco apesar de aliases, schema ou usuário", (TEST_DATABASE_URL) => {
    expect(() => getTestDatabaseUrl({ DATABASE_URL: `${development}_test`, TEST_DATABASE_URL })).toThrow("não podem ser o mesmo");
  });

  it("aceita banco dedicado e preserva a URL", () => {
    const TEST_DATABASE_URL = "postgresql://user:password@localhost:5432/obraflow_test";
    expect(getTestDatabaseUrl({ DATABASE_URL: development, TEST_DATABASE_URL })).toBe(TEST_DATABASE_URL);
  });
});
