import bcrypt from 'bcryptjs';

/**
 * Cost 12: roughly 250ms on the hardware this deploys to. High enough that an offline attack on a
 * leaked table is expensive, low enough that a login does not feel slow on a cold serverless start.
 */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
