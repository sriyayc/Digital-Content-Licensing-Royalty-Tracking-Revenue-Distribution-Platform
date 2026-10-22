// JWT session token (used by middleware and API routes)
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'session';

export type Role = 'ADMIN' | 'CREATOR';

export interface Session {
  user_id: number;
  email: string;
  role: Role;
  creator_id: number | null;
}

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set (see .env.example)');
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export function signSession(s: Session) {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
