import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type Role } from './session';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Require a signed-in user, optionally with one of the given roles. */
export async function requireUser(...roles: Role[]) {
  const s = await getSession();
  if (!s) throw new ApiError(401, 'Please sign in');
  if (roles.length && !roles.includes(s.role)) throw new ApiError(403, 'Not allowed for your role');
  return s;
}

/**
 * Wraps a route handler: returns JSON, and turns database validation errors
 * (CHECK, UNIQUE, FK, trigger SIGNAL) into 4xx responses with their message.
 */
export function route<C = any>(fn: (req: NextRequest, ctx: C) => Promise<unknown>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      const result = await fn(req, ctx);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err: any) {
      if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
      const dbErrors: Record<number, string> = {
        1644: err.sqlMessage,                                         // trigger / procedure SIGNAL
        3819: `Value rejected by CHECK constraint: ${err.sqlMessage}`,
        1062: `Duplicate value: ${err.sqlMessage}`,
        1451: 'Cannot delete: other records still reference this row',
        1452: 'Referenced record does not exist',
        1265: `Invalid value: ${err.sqlMessage}`,
        1366: `Invalid value: ${err.sqlMessage}`,
        1048: err.sqlMessage,
      };
      if (dbErrors[err.errno]) return NextResponse.json({ error: dbErrors[err.errno] }, { status: 422 });
      console.error(err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
