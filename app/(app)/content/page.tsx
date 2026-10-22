'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi, api, Card, Table, Message } from '@/components/ui';

const TYPES = ['AUDIO', 'VIDEO', 'IMAGE', 'TEXT', 'PODCAST'];
const ROLES = ['PRIMARY_ARTIST', 'FEATURED_ARTIST', 'COMPOSER', 'LYRICIST', 'PRODUCER', 'PUBLISHER', 'DIRECTOR'];

export default function ContentPage() {
  const me = useApi('/api/auth/me');
  const isAdmin = me.data?.user.role === 'ADMIN';
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const { data, reload } = useApi(`/api/content?q=${encodeURIComponent(q)}&type=${type}`);

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Content</h1>
      {isAdmin && <NewContent onSaved={reload} />}
      <Card title="Catalogue">
        <div className="mb-4 flex flex-wrap gap-3">
          <input className="input max-w-xs" placeholder="Full-text search (title, genre, synopsis)" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input max-w-40" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Table rows={data?.content ?? []} cols={[
          ['title', 'Title', (r) => <Link className="text-indigo-700 underline" href={`/content/${r.content_id}`}>{r.title}</Link>],
          ['content_type', 'Type'],
          ['genre', 'Genre'],
          ['release_date', 'Released'],
          ['allocated_pct', 'Ownership allocated', (r) => `${r.allocated_pct}% (${r.owners})`],
          ['licenses', 'Licences'],
        ]} />
      </Card>
    </>
  );
}

function NewContent({ onSaved }: { onSaved: () => void }) {
  const lookups = useApi('/api/lookups');
  const empty = { title: '', content_type: 'AUDIO', genre: '', release_date: '', duration_sec: '', synopsis: '' };
  const [f, setF] = useState(empty);
  const [owners, setOwners] = useState([{ creator_id: '', ownership_percentage: '100', role: 'PRIMARY_ARTIST' }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api('/api/content', 'POST', { ...f, owners: owners.filter((o) => o.creator_id) });
      setMsg({ ok: true, text: `Work #${r.content_id} created.` });
      setF(empty);
      onSaved();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }
  const setOwner = (i: number, k: string, v: string) => setOwners(owners.map((o, j) => (j === i ? { ...o, [k]: v } : o)));

  return (
    <Card title="Add work">
      <Message msg={msg} />
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="input" placeholder="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className="input" value={f.content_type} onChange={(e) => setF({ ...f, content_type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          <input className="input" placeholder="Genre" value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })} />
          <input className="input" type="date" value={f.release_date} onChange={(e) => setF({ ...f, release_date: e.target.value })} />
          <input className="input" type="number" placeholder="Duration (sec)" value={f.duration_sec} onChange={(e) => setF({ ...f, duration_sec: e.target.value })} />
          <input className="input" placeholder="Synopsis" value={f.synopsis} onChange={(e) => setF({ ...f, synopsis: e.target.value })} />
        </div>
        <span className="label">Ownership splits (a trigger rejects a total above 100%)</span>
        {owners.map((o, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-3">
            <select className="input" value={o.creator_id} onChange={(e) => setOwner(i, 'creator_id', e.target.value)}>
              <option value="">Creator…</option>
              {lookups.data?.creators.map((c: any) => <option key={c.creator_id} value={c.creator_id}>{c.name}</option>)}
            </select>
            <select className="input" value={o.role} onChange={(e) => setOwner(i, 'role', e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            <input className="input" type="number" step="0.01" placeholder="%" value={o.ownership_percentage} onChange={(e) => setOwner(i, 'ownership_percentage', e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" className="btn-light" onClick={() => setOwners([...owners, { creator_id: '', ownership_percentage: '', role: 'COMPOSER' }])}>+ owner</button>
          <button className="btn">Save</button>
        </div>
      </form>
    </Card>
  );
}
