/**
 * Sessions.
 *
 * A signed JWT in an httpOnly cookie. The token carries the user id and nothing else that matters —
 * the role is re-read from the database on every request rather than trusted from the token, so a
 * manager who is demoted loses their powers immediately instead of at token expiry.
 */
import 'server-only';

import { eq } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { users, type User } from '@/db/schema';

const COOKIE = 'ptt_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // one week

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not set.');
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true, // not readable from JavaScript, so an XSS bug cannot steal the session
    sameSite: 'lax', // survives normal navigation, not cross-site form posts
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * The actor for the current request, or null. Every server action and every page read derives the
 * actor from here — never from anything the client sent.
 */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const id = payload.sub;
    if (typeof id !== 'string') return null;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  } catch {
    // Expired, tampered with, or signed by a different secret. All mean "no session".
    return null;
  }
}

/** For pages: bounce to the login screen. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
