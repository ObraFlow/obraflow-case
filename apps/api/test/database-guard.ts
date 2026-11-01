/** Direct test runners must never write fixtures into the development database. */
export function assertTestDatabase(
  environment: { OBRAFLOW_TEST_DATABASE?: string; DATABASE_URL?: string } = process.env,
) {
  const name = environment.OBRAFLOW_TEST_DATABASE;
  const configured = new URL(environment.DATABASE_URL ?? "postgresql://localhost/obraflow");
  if (
    !name ||
    !/^obraflow_(?:test|phase1)_[a-f0-9]{32}$/.test(name) ||
    decodeURIComponent(configured.pathname.slice(1)) !== name
  ) {
    throw new Error(
      "Tests require an isolated database. Use npm test (optionally npm test -- api, web or e2e) from the repository root.",
    );
  }
}
