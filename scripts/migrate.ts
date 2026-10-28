import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../lib/auth";
import { getPool } from "../lib/db";

const { runMigrations } = await getMigrations(getAuth().options);
await runMigrations();
const pool = getPool();
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  // Defense in depth if this DB later has a public Data API enabled.
  for (const table of [
    "user",
    "session",
    "account",
    "verification",
    "rateLimit",
  ]) {
    await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
  }
  await client.query("COMMIT");
  console.log("Happen: auth and application schema are up to date.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
