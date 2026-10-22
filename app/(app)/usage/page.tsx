'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Badge, Message } from '@/components/ui';

const SAMPLE = JSON.stringify([
  { license_id: 1, usage_date: '2026-10-15', territory: 'IN', quantity: 18250, gross_revenue: 5840, subscriber_type: 'PREMIUM' },
  { license_id: 3, usage_date: '2026-10-15', territory: 'LK', quantity: 2300, gross_revenue: 736, subscriber_type: 'FREE' },
  { license_id: 8, usage_date: '2026-10-15', territory: 'IN', quantity: 500, gross_revenue: 160 },
], null, 2);

export default function UsagePage() {
  const lookups = useApi('/api/lookups');
  const { data, reload } = useApi('/api/usage-reports');
  const [platformId, setPlatformId] = useState('1');
  const [currency, setCurrency] = useState('INR');
  const [lines, setLines] = useState(SAMPLE);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api('/api/usage-reports', 'POST', { platform_id: platformId, currency, lines: JSON.parse(lines) });
      const errs = r.errors.map((x: any) => `line ${x.line}: ${x.error}`).join('; ');
      setMsg({ ok: r.status !== 'REJECTED', text: `${r.status}: ${r.accepted}/${r.total} lines accepted.${errs ? ' ' + errs : ''}` });
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Usage reports</h1>
      <p className="mb-4 text-sm text-slate-500">
        Raw reports are stored in MongoDB (each platform sends different fields). Valid lines are loaded into MySQL usage_record in one transaction.
      </p>
      <Message msg={msg} />
      <Card title="Submit report">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-3">
            <select className="input max-w-xs" value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
              {lookups.data?.platforms.map((p: any) => <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>)}
            </select>
            <input className="input max-w-24" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
          </div>
          <textarea className="input h-56 font-mono text-xs" value={lines} onChange={(e) => setLines(e.target.value)} />
          <button className="btn">Submit</button>
        </form>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Usage by territory (MongoDB aggregation)">
          <Table rows={data?.byTerritory ?? []} cols={[
            ['t', 'Territory', (r) => r._id.territory], ['c', 'Currency', (r) => r._id.currency],
            ['quantity', 'Quantity'], ['revenue', 'Revenue', (r) => r.revenue.toFixed(2)],
          ]} />
        </Card>
        <Card title="Reports per platform (MongoDB aggregation)">
          <Table rows={data?.byPlatform ?? []} cols={[['_id', 'Platform'], ['reports', 'Reports'], ['lines', 'Lines'], ['rejected_lines', 'Rejected lines']]} />
        </Card>
      </div>

      <Card title="Submitted reports (MongoDB usage_reports)">
        <Table rows={data?.reports ?? []} cols={[
          ['_id', 'Report id'], ['platform_name', 'Platform'],
          ['submitted_at', 'Submitted', (r) => new Date(r.submitted_at).toLocaleString()],
          ['currency', 'Currency'], ['sql_usage_ids', 'MySQL rows', (r) => r.sql_usage_ids.length],
          ['status', 'Status', (r) => <Badge>{r.status}</Badge>],
        ]} />
      </Card>
    </>
  );
}
