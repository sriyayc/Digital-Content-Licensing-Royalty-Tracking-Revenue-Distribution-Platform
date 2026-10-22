'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Badge, Message } from '@/components/ui';

const STATUSES = ['DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'];

export default function LicensesPage() {
  const me = useApi('/api/auth/me');
  const isAdmin = me.data?.user.role === 'ADMIN';
  const [status, setStatus] = useState('');
  const { data, reload } = useApi(`/api/licenses?status=${status}`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function changeStatus(id: number, s: string) {
    try {
      await api(`/api/licenses/${id}`, 'PATCH', { status: s });
      setMsg({ ok: true, text: `Licence #${id} set to ${s}.` });
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Licences</h1>
      <Message msg={msg} />
      {isAdmin && <NewLicense onSaved={(text) => { setMsg({ ok: true, text }); reload(); }} onError={(text) => setMsg({ ok: false, text })} />}
      <Card title="All licences (view v_license_overview)">
        <select className="input mb-4 max-w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Table rows={data?.licenses ?? []} cols={[
          ['license_id', '#'], ['content_title', 'Work'], ['platform_name', 'Platform'], ['license_type', 'Type'],
          ['territories', 'Territories'], ['start_date', 'Start'], ['end_date', 'End'], ['royalty_rate', 'Rate'], ['currency', 'Cur.'],
          ['status', 'Status', (r) => isAdmin
            ? <select className="input py-1 text-xs" value={r.status} onChange={(e) => changeStatus(r.license_id, e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            : <Badge>{r.status}</Badge>],
        ]} />
      </Card>
    </>
  );
}

function NewLicense({ onSaved, onError }: { onSaved: (m: string) => void; onError: (m: string) => void }) {
  const lookups = useApi('/api/lookups');
  const [f, setF] = useState({ platform_id: '', content_id: '', license_type: 'NON_EXCLUSIVE', start_date: '', end_date: '', royalty_rate: '0.5', currency: 'INR', territories: 'IN', status: 'ACTIVE' });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api('/api/licenses', 'POST', f);
      onSaved(`Licence #${r.license_id} created.`);
    } catch (err: any) {
      onError(err.message);
    }
  }

  return (
    <Card title="New licence">
      <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
        <select className="input" required value={f.platform_id} onChange={set('platform_id')}>
          <option value="">Platform…</option>
          {lookups.data?.platforms.map((p: any) => <option key={p.platform_id} value={p.platform_id}>{p.platform_name}</option>)}
        </select>
        <select className="input" required value={f.content_id} onChange={set('content_id')}>
          <option value="">Work…</option>
          {lookups.data?.content.map((c: any) => <option key={c.content_id} value={c.content_id}>{c.title}</option>)}
        </select>
        <select className="input" value={f.license_type} onChange={set('license_type')}>
          {['EXCLUSIVE', 'NON_EXCLUSIVE', 'SUBLICENSABLE'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input className="input" placeholder="Territories e.g. IN,US or WW" value={f.territories} onChange={set('territories')} />
        <label><span className="label">Start date</span><input className="input" type="date" required value={f.start_date} onChange={set('start_date')} /></label>
        <label><span className="label">End date (empty = perpetual)</span><input className="input" type="date" value={f.end_date} onChange={set('end_date')} /></label>
        <label><span className="label">Royalty rate (0–1)</span><input className="input" type="number" step="0.0001" value={f.royalty_rate} onChange={set('royalty_rate')} /></label>
        <label><span className="label">Currency</span><input className="input" maxLength={3} value={f.currency} onChange={set('currency')} /></label>
        <div><button className="btn">Create licence</button></div>
      </form>
    </Card>
  );
}
