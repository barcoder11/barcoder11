import pg from "pg";

/**
 * Every E2E test runs from the same IP address, so the app's per-IP rate
 * limits would eventually block repeated local runs. Start each run with
 * fresh counters (test database only — production limits are unchanged).
 */
export default async function globalSetup() {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres",
  });
  try {
    await pool.query("delete from public.rate_limits");
  } finally {
    await pool.end();
  }
}
