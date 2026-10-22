import { route, requireUser, ApiError } from '@/lib/api';
import { query } from '@/lib/mysql';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const [content] = await query('SELECT * FROM content WHERE content_id = ?', [id]);
  if (!content) throw new ApiError(404, 'Content not found');
  const owners = await query(
    `SELECT c.name, o.ownership_percentage, o.role FROM ownership o
       JOIN creator c ON c.creator_id = o.creator_id WHERE o.content_id = ?`, [id]);
  const licenses = await query('SELECT * FROM v_license_overview WHERE content_id = ?', [id]);
  return { content, owners, licenses };
});

// Fails if the work is licensed (license.content_id is ON DELETE RESTRICT)
export const DELETE = route<Ctx>(async (_req, { params }) => {
  await requireUser('ADMIN');
  await query('DELETE FROM content WHERE content_id = ?', [(await params).id]);
  return { ok: true };
});
