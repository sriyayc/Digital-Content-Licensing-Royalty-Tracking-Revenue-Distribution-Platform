import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { route, ApiError } from '@/lib/api';
import { query } from '@/lib/mysql';
import { SESSION_COOKIE, signSession } from '@/lib/session';

export const POST = route(async (req) => {
  const { email, password } = await req.json();
  const [user] = await query('SELECT * FROM app_user WHERE email = ?', [String(email ?? '').trim().toLowerCase()]);
  if (!user || !(await bcrypt.compare(String(password ?? ''), user.password_hash))) {
    throw new ApiError(401, 'Invalid e-mail or password');
  }
  const session = { user_id: user.user_id, email: user.email, role: user.role, creator_id: user.creator_id };
  const res = NextResponse.json({ user: session });
  res.cookies.set(SESSION_COOKIE, await signSession(session), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
  return res;
});
