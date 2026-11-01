import type { FastifyInstance } from "fastify";

// Browser specs run against a real API and the isolated test database. They also start the API in-process, to sign
// tokens and to create and clean up their own data. The API modules are imported on demand, not at the top of a
// spec, so the Playwright config has already pointed the environment at the test database when they load.

type ApiHelpers = typeof import("../../../api/test/helpers");

export type Server = FastifyInstance;
export type Database = (typeof import("../../../api/src/db/data-source"))["dataSource"];
/** Users, a project and a supplier created for one spec, with a `cleanup()` that removes them. */
export type Fixture = Awaited<ReturnType<ApiHelpers["fixture"]>>;

/** The API in this process, used to sign tokens and to inject requests. */
export async function startServer(): Promise<Server> {
  return (await import("../../../api/test/helpers")).setup();
}
/** The connection to the test database, for assertions and for data the UI cannot create. */
export async function loadDatabase(): Promise<Database> {
  return (await import("../../../api/src/db/data-source")).dataSource;
}
export async function createFixture(): Promise<Fixture> {
  return (await import("../../../api/test/helpers")).fixture();
}
/** The counterpart of `startServer` and `loadDatabase`, for `afterAll`. */
export async function stopApi(server: Server | undefined, database: Database | undefined) {
  await server?.close();
  if (database?.isInitialized) await database.destroy();
}
