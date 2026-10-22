'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Badge, Message, money } from '@/components/ui';

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'];

export default function PaymentsPage() {
  const me = useApi('/api/auth/me');
  const isAdmin = me.data?.user.role === 'ADMIN';
  const { data, reload } = useApi('/api/payments');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => Promise<unknown>, text: string) {
    try {
      await fn();
      setMsg({ ok: true, text });
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Payments</h1>
      <Message msg={msg} />
      <Card title="Unpaid balances">
        {isAdmin && (
          <select className="input mb-4 max-w-48" value={method} onChange={(e) => setMethod(e.target.value)}>
            {['BANK_TRANSFER', 'UPI', 'PAYPAL', 'WIRE', 'CHEQUE'].map((m) => <option key={m}>{m}</option>)}
          </select>
        )}
        <Table rows={data?.payable ?? []} cols={[
          ['name', 'Creator'], ['currency', 'Currency'], ['unpaid', 'Unpaid', (r) => money(r.unpaid, r.currency)],
          ...(isAdmin ? [['pay', '', (r: any) => (
            <button className="btn-light" onClick={() => run(
              () => api('/api/payments', 'POST', { creator_id: r.creator_id, currency: r.currency, method }),
              `Payout created for ${r.name} (sp_settle_creator_payout).`)}>Pay</button>
          )] as [string, string, (r: any) => React.ReactNode]] : []),
        ]} />
      </Card>
      <Card title="Payment history">
        <Table rows={data?.payments ?? []} cols={[
          ['payment_id', '#'], ['creator', 'Creator'], ['payment_date', 'Date'], ['method', 'Method'], ['transaction_ref', 'Reference'],
          ['amount', 'Amount', (r) => money(r.amount, r.currency)],
          ['status', 'Status', (r) => isAdmin
            ? <select className="input py-1 text-xs" value={r.status} onChange={(e) => run(
                () => api(`/api/payments/${r.payment_id}`, 'PATCH', { status: e.target.value }), `Payment #${r.payment_id} updated.`)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            : <Badge>{r.status}</Badge>],
        ]} />
      </Card>
    </>
  );
}
