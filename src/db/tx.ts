import type { db } from './index';

/**
 * The type of a transaction handle. Extracted so `src/lib/activity.ts` can require one without
 * importing the client and dragging the connection into modules that only need types.
 */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
