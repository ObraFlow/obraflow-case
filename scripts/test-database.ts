function identifyDatabase(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A URL do banco de teste é inválida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Os testes exigem uma URL PostgreSQL.");
  }
  // localhost e loopbacks são tratados como a mesma identidade local.
  const hostname = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase())
    ? "localhost"
    : url.hostname.toLowerCase();
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database || database.includes("/")) {
    throw new Error("A URL precisa identificar um único banco de dados.");
  }
  return { hostname, port: url.port || "5432", database };
}

export function getTestDatabaseUrl(environment: Record<string, string | undefined>) {
  if (!environment.TEST_DATABASE_URL) {
    throw new Error("Defina TEST_DATABASE_URL com um banco dedicado terminado em _test.");
  }
  if (!environment.DATABASE_URL) {
    throw new Error("Defina DATABASE_URL para verificar o isolamento do banco de teste.");
  }
  const test = identifyDatabase(environment.TEST_DATABASE_URL);
  const development = identifyDatabase(environment.DATABASE_URL);
  if (!test.database.endsWith("_test")) {
    throw new Error("O nome do banco de integração deve terminar em _test.");
  }
  if (test.hostname === development.hostname && test.port === development.port && test.database === development.database) {
    throw new Error("Banco de teste e desenvolvimento não podem ser o mesmo, mesmo com usuários ou schemas diferentes.");
  }
  return environment.TEST_DATABASE_URL;
}
