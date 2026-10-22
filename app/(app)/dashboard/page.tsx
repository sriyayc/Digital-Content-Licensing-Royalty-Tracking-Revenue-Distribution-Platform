'use client';

import { useApi, Card, Table, money } from '@/components/ui';

export default function Dashboard() {
  const { data, error } = useApi('/api/dashboard');
  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const earningsCols: [string, string, ((r: any) => React.ReactNode)?][] = [
    ['name', 'Creator'],
    ['currency', 'Currency'],
    ['royalty_lines', 'Lines'],
    ['total_earned', 'Earned', (r) => money(r.total_earned, r.currency)],
    ['total_paid', 'Paid', (r) => money(r.total_paid, r.currency)],
    ['unpaid', 'Unpaid', (r) => money(r.unpaid, r.currency)],
  ];

  if (data.role === 'CREATOR') {
    return (
      <>
        <h1 className="mb-4 text-2xl font-semibold">My earnings</h1>
        <Card title="Earnings (view v_creator_earnings)"><Table rows={data.earnings} cols={earningsCols} /></Card>
        <Card title="My works">
          <Table rows={data.works} cols={[['title', 'Title'], ['role', 'Role'], ['ownership_percentage', 'Share %']]} />
        </Card>
      </>
    );
  }

  const t = data.totals;
  const stats = [
    ['Works', t.content], ['Creators', t.creators], ['Active licences', t.active_licenses],
    ['Gross revenue (INR)', money(t.gross_inr)], ['Unpaid royalties (INR)', money(t.unpaid_inr)],
  ];
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Admin dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-xl font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <Card title="Revenue by platform (view v_platform_monthly_revenue)">
        <Table rows={data.platformRevenue} cols={[
          ['platform_name', 'Platform'], ['currency', 'Currency'], ['units', 'Units'],
          ['gross_revenue', 'Gross revenue', (r) => money(r.gross_revenue, r.currency)],
        ]} />
      </Card>
      <Card title="Creator earnings (view v_creator_earnings)"><Table rows={data.earnings} cols={earningsCols} /></Card>
    </>
  );
}
