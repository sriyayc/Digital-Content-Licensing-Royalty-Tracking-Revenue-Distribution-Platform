import { route, requireUser } from '@/lib/api';
import { query, withTransaction } from '@/lib/mysql';

// Admin sees all licences; a creator sees licences of works they own.
export const GET = route(async (req) => {
  const s = await requireUser();
  const status = req.nextUrl.searchParams.get('status');
  const where: string[] = [];
  const params: unknown[] = [];
  if (s.role === 'CREATOR') {
    where.push('content_id IN (SELECT content_id FROM ownership WHERE creator_id = ?)');
    params.push(s.creator_id);
  }
  if (status) { where.push('status = ?'); params.push(status); }
  const licenses = await query(
    `SELECT * FROM v_license_overview ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY license_id`, params);
  return { licenses };
});

// Licence + its territories in one transaction
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  const territories: string[] = String(b.territories ?? '').split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
  const id = await withTransaction(async (conn) => {
    const [res]: any = await conn.query(
      `INSERT INTO license (platform_id, content_id, license_type, start_date, end_date, royalty_rate, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.platform_id, b.content_id, b.license_type, b.start_date, b.end_date || null, b.royalty_rate, b.currency, b.status || 'DRAFT'],
    );
    for (const t of territories) await conn.query('INSERT INTO license_territory VALUES (?, ?)', [res.insertId, t]);
    return res.insertId;
  });
  return { license_id: id };
});
