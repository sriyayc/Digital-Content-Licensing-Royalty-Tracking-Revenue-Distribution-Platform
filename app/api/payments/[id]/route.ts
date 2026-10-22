import { route, requireUser } from '@/lib/api';
import { query } from '@/lib/mysql';

// Update payment status. FAILED / REVERSED fires trg_payment_au which
// releases the royalty lines back to unpaid.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireUser('ADMIN');
  const { status } = await req.json();
  await query('UPDATE payment SET status = ? WHERE payment_id = ?', [status, (await params).id]);
  return { ok: true };
});
