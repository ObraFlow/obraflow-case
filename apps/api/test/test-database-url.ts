import 'dotenv/config';

/**
 * Banco dos testes e2e: o mesmo Postgres do desenvolvimento, mas no banco "dokimos_test",
 * para os testes nunca apagarem os dados de desenvolvimento. Pode ser sobrescrito com TEST_DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    (process.env.DATABASE_URL ?? '').replace(
      /\/dokimos(\?|$)/,
      '/dokimos_test$1',
    )
  );
}
