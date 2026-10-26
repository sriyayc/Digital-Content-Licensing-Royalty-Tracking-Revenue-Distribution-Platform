'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Message } from '@/components/ui';

const TYPES = ['INDIVIDUAL', 'BAND', 'LABEL', 'STUDIO', 'ESTATE'];
const EMPTY = { name: '', creator_type: 'INDIVIDUAL', email: '', phone: '', country: 'IN', payout_currency: 'INR' };

export default function CreatorsPage() {
  const me = useApi('/api/auth/me');
  const isAdmin = me.data?.user.role === 'ADMIN';
  const { data, reload } = useApi('/api/creators');
  const [f, setF] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await api('/api/creators', 'PUT', { ...f, creator_id: editId });
        setMsg({ ok: true, text: `Creator #${editId} updated.` });
      } else {
        const r = await api('/api/creators', 'POST', f);
        setMsg({ ok: true, text: `Creator #${r.creator_id} added.` });
      }
      setF(EMPTY);
      setEditId(null);
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  function edit(r: any) {
    setEditId(r.creator_id);
    setF({ name: r.name, creator_type: r.creator_type, email: r.email, phone: r.phone ?? '', country: r.country, payout_currency: r.payout_currency });
  }

  if (me.data && !isAdmin) return <p>Only admins can manage creators.</p>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Creators</h1>
      <Card title={editId ? `Edit creator #${editId}` : 'Add creator'}>
        <Message msg={msg} />
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input className="input" placeholder="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <select className="input" value={f.creator_type} onChange={(e) => setF({ ...f, creator_type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input" type="email" placeholder="E-mail" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className="input" placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <input className="input" placeholder="Country (2 letters, e.g. IN)" required maxLength={2} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} />
            <input className="input" placeholder="Currency (e.g. INR)" required maxLength={3} value={f.payout_currency} onChange={(e) => setF({ ...f, payout_currency: e.target.value.toUpperCase() })} />
          </div>
          <div className="flex gap-2">
            <button className="btn">{editId ? 'Update' : 'Save'}</button>
            {editId && <button type="button" className="btn-light" onClick={() => { setEditId(null); setF(EMPTY); }}>Cancel</button>}
          </div>
        </form>
      </Card>
      <Card title="All creators">
        <Table rows={data?.creators ?? []} cols={[
          ['name', 'Name'],
          ['creator_type', 'Type'],
          ['email', 'E-mail'],
          ['country', 'Country'],
          ['payout_currency', 'Currency'],
          ['works', 'Works owned'],
          ['creator_id', '', (r) => <button className="btn-light" onClick={() => edit(r)}>Edit</button>],
        ]} />
      </Card>
    </>
  );
}