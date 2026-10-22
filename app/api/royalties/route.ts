import { route, requireUser } from '@/lib/api';
import { query } from '@/lib/mysql';

// Royalty lines (creators only see their own). ?paid=yes|no filter.
export const GET = route(async (req) => {
  const s = await requireUser();
  const paid = req.nextUrl.searchParams.get('paid');
  const where: string[] = [];
  const params: unknown[] = [];
  if (s.role === 'CREATOR') { where.push('r.creator_id = ?'); params.push(s.creator_id); }
  if (paid === 'no') where.push('r.payment_id IS NULL');
  if (paid === 'yes') where.push('r.payment_id IS NOT NULL');

  const lines = await query(`
    SELECT r.royalty_id, cr.name AS creator, c.title, p.platform_name, u.usage_date, u.gross_revenue,
           r.rate_applied, r.ownership_percentage_applied, r.calculated_amount, r.currency, r.payment_id
      FROM royalty r
      JOIN creator      cr ON cr.creator_id = r.creator_id
      JOIN usage_record u  ON u.usage_id    = r.usage_id
      JOIN license      l  ON l.license_id  = u.license_id
      JOIN content      c  ON c.content_id  = l.content_id
      JOIN platform     p  ON p.platform_id = l.platform_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY u.usage_date DESC, r.royalty_id DESC
     LIMIT 300`, params);
  return { lines };
});
