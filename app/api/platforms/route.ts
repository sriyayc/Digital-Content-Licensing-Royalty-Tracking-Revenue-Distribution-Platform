import { route, requireUser } from '@/lib/api';
import { query, withTransaction } from '@/lib/mysql';

// GET /api/platforms : list all platforms
export const GET = route(async () => {
  await requireUser('ADMIN');
  const platforms = await query(`
    SELECT platform_id, platform_name, platform_type, country, contact_email
      FROM platform
     ORDER BY platform_name`);
  return { platforms };
});

// POST /api/platforms : add a platform (UNIQUE name and CHECK e-mail are enforced by the database)
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  const id = await withTransaction(async (conn) => {
    const [res]: any = await conn.query(
      'INSERT INTO platform (platform_name, platform_type, country, contact_email) VALUES (?, ?, ?, ?)',
      [b.platform_name, b.platform_type, b.country, b.contact_email],
    );
    return res.insertId;
  });
  return { platform_id: id };
});

// PUT /api/platforms : edit an existing platform
export const PUT = route(async (req) => {
  await requireUser('ADMIN');
  const b = await req.json();
  await withTransaction(async (conn) => {
    await conn.query(
      'UPDATE platform SET platform_name = ?, platform_type = ?, country = ?, contact_email = ? WHERE platform_id = ?',
      [b.platform_name, b.platform_type, b.country, b.contact_email, b.platform_id],
    );
  });
  return { ok: true };
});