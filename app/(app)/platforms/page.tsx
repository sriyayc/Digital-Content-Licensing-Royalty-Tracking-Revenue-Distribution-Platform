'use client';

import { useState } from 'react';
import { useApi, api, Card, Table, Message } from '@/components/ui';

const TYPES = ['STREAMING', 'SOCIAL', 'DOWNLOAD', 'BROADCAST', 'OTHER'];
const EMPTY = { platform_name: '', platform_type: 'STREAMING', country: 'IN', contact_email: '' };

export default function PlatformsPage() {
  const me = useApi('/api/auth/me');
  const isAdmin = me.data?.user.role === 'ADMIN';
  const { data, reload } = useApi('/api/platforms');
  const [f, setF] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await api('/api/platforms', 'PUT', { ...f, platform_id: editId });
        setMsg({ ok: true, text: `Platform #${editId} updated.` });
      } else {
        const r = await api('/api/platforms', 'POST', f);
        setMsg({ ok: true, text: `Platform #${r.platform_id} added.` });
      }
      setF(EMPTY);
      setEditId(null);
      reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  function edit(r: any) {
    setEditId(r.platform_id);
    setF({ platform_name: r.platform_name, platform_type: r.platform_type, country: r.country, contact_email: r.contact_email });
  }

  if (me.data && !isAdmin) return <p>Only admins can manage platforms.</p>;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Platforms</h1>
      <Card title={editId ? `Edit platform #${editId}` : 'Add platform'}>
        <Message msg={msg} />
        <form onSubmit={save} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <input className="input" placeholder="Platform name" required value={f.platform_name} onChange={(e) => setF({ ...f, platform_name: e.target.value })} />
            <select className="input" value={f.platform_type} onChange={(e) => setF({ ...f, platform_type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input" placeholder="Country (2 letters, e.g. IN)" required maxLength={2} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value.toUpperCase() })} />
            <input className="input" type="email" placeholder="Contact e-mail" required value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className="btn">{editId ? 'Update' : 'Save'}</button>
            {editId && <button type="button" className="btn-light" onClick={() => { setEditId(null); setF(EMPTY); }}>Cancel</button>}
          </div>
        </form>
      </Card>
      <Card title="All platforms">
        <Table rows={data?.platforms ?? []} cols={[
          ['platform_name', 'Name'],
          ['platform_type', 'Type'],
          ['country', 'Country'],
          ['contact_email', 'Contact e-mail'],
          ['platform_id', '', (r) => <button className="btn-light" onClick={() => edit(r)}>Edit</button>],
        ]} />
      </Card>
    </>
  );
}