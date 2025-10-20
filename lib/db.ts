// This file manages the PostgreSQL connection pool for the Next.js app.
// It uses TypeScript for type safety.

// Lazy, build-safe pg pool
import { Pool } from 'pg';

let pool: Pool | null = null;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Throw only at runtime on first use, not during import/build.
    throw new Error('DATABASE_URL is not set. Provide it via env when running the server/container.');
  }

  const useSSL =
    process.env.PGSSL?.toLowerCase() === 'true' || connectionString.includes('neon.tech');

  return new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE || 30000),
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT || 10000),
  });
}

function getPool(): Pool {
  if (!pool) pool = createPool();
  return pool;
}

// Default export: expose common methods lazily so imports don’t connect at build
const lazyPool = {
  query: (...args: Parameters<Pool['query']>) => getPool().query(...args),
  connect: (...args: Parameters<Pool['connect']>) => (getPool() as any).connect(...args),
  end: () => pool?.end(),
} as unknown as Pool;

export default lazyPool;
export { getPool };
