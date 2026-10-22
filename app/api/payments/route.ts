import { route, requireUser } from '@/lib/api';
import { query, withConnection } from '@/lib/mysql';

export const GET = route(async () => {
  const s = await requireUser();
  const mine = s.role === 'CREATOR';
  const payments = await query(`
    SELECT p.*, c.name AS creator FROM payment p JOIN creator c ON c.creator_id = p.creator_id
     ${mine ? 'WHERE p.creator_id = ?' : ''} ORDER BY p.payment_id DESC`, mine ? [s.creator_id] : []);
  // creators who are owed money (from view v_creator_earnings)
  const payable = await query(
    `SELECT creator_id, name, currency, unpaid FROM v_creator_earnings WHERE unpaid > 0 ${mine ? 'AND creator_id = ?' : ''} ORDER BY unpaid DESC`,
    mine ? [s.creator_id] : []);
  return { payments, payable };
});

// CALL sp_settle_creator_payout(creator, currency, method, @payment_id)
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const { creator_id, currency, method } = await req.json();
  return withConnection(async (conn) => {
    await conn.query('CALL sp_settle_creator_payout(?, ?, ?, @pid)', [creator_id, currency, method]);
    const [[row]]: any = await conn.query('SELECT @pid AS payment_id');
    return { payment_id: row.payment_id };
  });
});
