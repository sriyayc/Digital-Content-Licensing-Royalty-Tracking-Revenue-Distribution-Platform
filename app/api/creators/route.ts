import { route, requireUser } from '@/lib/api';
import { query, withTransaction } from '@/lib/mysql';

// GET /api/creators : list all creators with how many works each owns
export const GET = route(async () => {
  await requireUser('ADMIN');
  const creators = await query(`
    SELECT c.creator_id, c.name, c.creator_type, c.email, c.phone, c.country, c.payout_currency,
           (SELECT COUNT(*) FROM ownership o WHERE o.creator_id = c.creator_id) AS works
      FROM creator c
     ORDER BY c.name`);
  return { creators };
});

// POST /api/creators : add a creator (UNIQUE and CHECK constraints reject bad e-mails)
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  const id = await withTransaction(async (conn) => {
    const [res]: any = await conn.query(
      'INSERT INTO creator (name, creator_type, email, phone, country, payout_currency) VALUES (?, ?, ?, ?, ?, ?)',
      [b.name, b.creator_type, b.email, b.phone || null, b.country, b.payout_currency || 'INR'],
    );
    return res.insertId;
  });
  return { creator_id: id };
});

// PUT /api/creators : edit an existing creator
export const PUT = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  await withTransaction(async (conn) => {
    await conn.query(
      'UPDATE creator SET name = ?, creator_type = ?, email = ?, phone = ?, country = ?, payout_currency = ? WHERE creator_id = ?',
      [b.name, b.creator_type, b.email, b.phone || null, b.country, b.payout_currency || 'INR', b.creator_id],
    );
  });
  return { ok: true };
});