import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DatabaseClient = Database | Transaction;
export type PostgresClient = ReturnType<typeof postgres>;
