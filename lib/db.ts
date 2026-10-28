import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type Database = {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<T[]>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
};

let pool: Pool | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
  });
  return pool;
}

function connectionDb(client: PoolClient): Database {
  return {
    async query(sql, values = []) {
      return (await client.query(sql, values)).rows;
    },
    async transaction(work) {
      return work(connectionDb(client));
    },
  };
}

export const database: Database = {
  async query(sql, values = []) {
    return (await getPool().query(sql, values)).rows;
  },
  async transaction(work) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await work(connectionDb(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
