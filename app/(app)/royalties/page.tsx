'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Message, money } from '@/components/ui';

export default function RoyaltiesPage() {
  const me = useApi('/api/auth/me');
  const [paid, setPaid] = useState('');
  const { data, reload } = useApi(`/api/royalties?paid=${paid}`);
  const [period, setPeriod] = useState({ period_start: '2026-07-01', period_end: '2026-09-30' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api('/api/royalties/calculate', 'POST', period);
      setMsg({ ok: true, text: `${r.lines} royalty lines created.` });
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Royalties</h1>
      <p className="mb-4 text-sm text-slate-500">royalty = gross revenue × licence rate × ownership share</p>
      <Message msg={msg} />
      {me.data?.user.role === 'ADMIN' && (
        <Card title="Calculate royalties (stored procedure sp_calculate_royalties)">
          <form onSubmit={calculate} className="flex flex-wrap items-end gap-3">
            <label><span className="label">From</span><input className="input" type="date" value={period.period_start} onChange={(e) => setPeriod({ ...period, period_start: e.target.value })} /></label>
            <label><span className="label">To</span><input className="input" type="date" value={period.period_end} onChange={(e) => setPeriod({ ...period, period_end: e.target.value })} /></label>
            <button className="btn">Calculate</button>
          </form>
        </Card>
      )}
      <Card title="Royalty lines">
        <select className="input mb-4 max-w-48" value={paid} onChange={(e) => setPaid(e.target.value)}>
          <option value="">All</option><option value="no">Unpaid</option><option value="yes">Paid / in payment</option>
        </select>
        <Table rows={data?.lines ?? []} cols={[
          ['royalty_id', '#'], ['creator', 'Creator'], ['title', 'Work'], ['platform_name', 'Platform'], ['usage_date', 'Usage date'],
          ['gross_revenue', 'Gross'], ['rate_applied', 'Rate'], ['ownership_percentage_applied', 'Share %'],
          ['calculated_amount', 'Royalty', (r) => money(r.calculated_amount, r.currency)],
          ['payment_id', 'Payment', (r) => (r.payment_id ? `#${r.payment_id}` : 'unpaid')],
        ]} />
      </Card>
    </>
  );
}
