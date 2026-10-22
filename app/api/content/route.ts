import { route, requireUser } from '@/lib/api';
import { query, withTransaction } from '@/lib/mysql';

// GET /api/content?q=&type=   q uses the FULLTEXT index on (title, genre, synopsis)
export const GET = route(async (req) => {
  await requireUser();
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const type = req.nextUrl.searchParams.get('type');
  const where: string[] = [];
  const params: unknown[] = [];
  if (q) { where.push('MATCH(c.title, c.genre, c.synopsis) AGAINST (?)'); params.push(q); }
  if (type) { where.push('c.content_type = ?'); params.push(type); }

  const content = await query(`
    SELECT c.content_id, c.title, c.content_type, c.genre, c.release_date, c.synopsis,
           COUNT(o.creator_id)                       AS owners,
           COALESCE(SUM(o.ownership_percentage), 0) AS allocated_pct,
           (SELECT COUNT(*) FROM license l WHERE l.content_id = c.content_id) AS licenses
      FROM content c
      LEFT JOIN ownership o ON o.content_id = c.content_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     GROUP BY c.content_id
     ORDER BY c.title`, params);
  return { content };
});

// Create a work and its ownership splits in one transaction.
// trg_ownership_bi rejects splits above 100% and everything is rolled back.
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  const id = await withTransaction(async (conn) => {
    const [res]: any = await conn.query(
      'INSERT INTO content (title, content_type, genre, release_date, duration_sec, synopsis) VALUES (?, ?, ?, ?, ?, ?)',
      [b.title, b.content_type, b.genre || null, b.release_date || null, b.duration_sec || null, b.synopsis || null],
    );
    for (const o of b.owners ?? []) {
      await conn.query('INSERT INTO ownership VALUES (?, ?, ?, ?)', [o.creator_id, res.insertId, o.ownership_percentage, o.role]);
    }
    return res.insertId;
  });
  return { content_id: id };
});
