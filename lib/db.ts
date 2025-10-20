// This file manages the PostgreSQL connection pool for the Next.js app.
// It uses TypeScript for type safety.

import { Pool } from 'pg';

// We'll use a global variable to hold the pool.
// This is because in a serverless environment, a single function invocation might
// process multiple requests and we want to reuse the connection pool across them.
declare global {
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

let pool: Pool;    

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Check if we're in a production environment
if (process.env.NODE_ENV === 'production') {
  // If we're in production, we create a new pool
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Required for Neon
    },
  });
} else {
  // If we're not in production, we use the global variable
  // to prevent creating multiple connections during hot-reloading in development.
  if (!global.pool) {
    global.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
    });
  }
  pool = global.pool;
}

export default pool;
