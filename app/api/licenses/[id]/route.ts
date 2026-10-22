import { route, requireUser } from '@/lib/api';
import { query } from '@/lib/mysql';

// Change licence status
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireUser('ADMIN');
  const { status } = await req.json();
  await query('UPDATE license SET status = ? WHERE license_id = ?', [status, (await params).id]);
  return { ok: true };
});
