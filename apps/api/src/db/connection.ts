type Environment = Record<string, string | undefined>;
type Connection =
  { url: string } | { host: string; port: number; database: string; username: string; password: string };

const discreteKeys = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"] as const;

function port(value: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error("Invalid database configuration: port must be an integer from 1 to 65535.");
  }
  return Number(value);
}

/** URL wins when supplied; otherwise require a complete discrete connection. Never log values. */
export function databaseConnection(env: Environment = process.env): Connection {
  if (env.DATABASE_URL !== undefined) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
        throw new Error();
      }
    } catch {
      throw new Error("Invalid database configuration: DATABASE_URL must be a PostgreSQL URL with host and database.");
    }
    return { url: env.DATABASE_URL };
  }

  if (discreteKeys.some((key) => env[key] !== undefined)) {
    const missing = discreteKeys.filter((key) => !env[key]?.trim());
    if (missing.length) {
      throw new Error(`Incomplete database configuration: set ${missing.join(", ")}.`);
    }
    return {
      host: env.PGHOST!,
      port: port(env.PGPORT!),
      database: env.PGDATABASE!,
      username: env.PGUSER!,
      password: env.PGPASSWORD!,
    };
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Missing database configuration: set DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD.",
    );
  }
  return {
    host: "127.0.0.1",
    port: port(env.POSTGRES_PORT ?? "6000"),
    database: "obraflow",
    username: "obraflow",
    password: "obraflow",
  };
}
