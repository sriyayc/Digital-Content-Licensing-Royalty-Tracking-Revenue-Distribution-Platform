import { route, requireUser } from '@/lib/api';
import { query } from '@/lib/mysql';

export const GET = route(async () => {
  const s = await requireUser();

  if (s.role === 'CREATOR') {
    const earnings = await query('SELECT * FROM v_creator_earnings WHERE creator_id = ?', [s.creator_id]);
    const works = await query(
      `SELECT c.title, o.role, o.ownership_percentage FROM ownership o
         JOIN content c ON c.content_id = o.content_id WHERE o.creator_id = ?`, [s.creator_id]);
    return { role: s.role, earnings, works };
  }

  const [totals] = await query(`
    SELECT (SELECT COUNT(*) FROM content)                          AS content,
           (SELECT COUNT(*) FROM creator)                          AS creators,
           (SELECT COUNT(*) FROM license WHERE status = 'ACTIVE')  AS active_licenses,
           (SELECT COALESCE(SUM(gross_revenue), 0) FROM usage_record WHERE currency = 'INR') AS gross_inr,
           (SELECT COALESCE(SUM(calculated_amount), 0) FROM royalty WHERE currency = 'INR' AND payment_id IS NULL) AS unpaid_inr`);
  const platformRevenue = await query(`
    SELECT platform_name, currency, SUM(gross_revenue) AS gross_revenue, SUM(total_quantity) AS units
      FROM v_platform_monthly_revenue GROUP BY platform_name, currency ORDER BY gross_revenue DESC`);
  const earnings = await query(`SELECT * FROM v_creator_earnings ORDER BY currency, total_earned DESC`);
  return { role: s.role, totals, platformRevenue, earnings };
});
