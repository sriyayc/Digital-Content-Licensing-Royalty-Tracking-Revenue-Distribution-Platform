import { route, requireUser } from '@/lib/api';
import { withConnection } from '@/lib/mysql';

// CALL sp_calculate_royalties(start, end, @lines)
export const POST = route(async (req) => {
  await requireUser('ADMIN');
  const { period_start, period_end } = await req.json();
  return withConnection(async (conn) => {
    await conn.query('CALL sp_calculate_royalties(?, ?, @lines)', [period_start, period_end]);
    const [[row]]: any = await conn.query('SELECT @lines AS lines_created');
    return { lines: row.lines_created };
  });
});
