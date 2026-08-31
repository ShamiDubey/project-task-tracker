/**
 * The database client.
 *
 * Uses Neon's WebSocket pool driver rather than the simpler HTTP driver, because the HTTP driver
 * cannot hold an interactive transaction open across multiple statements. Almost every mutation in
 * this application is genuinely multi-statement: a task status change writes the task, its activity
 * row and sometimes its completed_at together, and Goal 9 means a change without its timeline entry
 * is a bug rather than a slightly-stale read. One extra dependency (`ws`) is cheap insurance against
 * a half-applied write. See docs/decisions.md.
 */
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

// Node has no global WebSocket until v22; this project targets Node 20.
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

/**
 * Reused across invocations in development, where Next.js hot-reloads modules and would otherwise
 * leak a pool per reload.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
