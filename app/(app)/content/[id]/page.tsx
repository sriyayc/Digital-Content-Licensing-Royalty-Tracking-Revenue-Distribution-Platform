'use client';

import { use, useState } from 'react';
import { useApi, api, Card, Table, Badge, Message } from '@/components/ui';

export default function ContentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const me = useApi('/api/auth/me');
  const { data, error } = useApi(`/api/content/${id}`);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p>Loading…</p>;
  const c = data.content;

  async function remove() {
    try {
      await api(`/api/content/${id}`, 'DELETE');
      window.location.href = '/content';
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{c.title}</h1>
      <p className="mb-4 text-sm text-slate-500">{c.content_type} · {c.genre} · {c.release_date} — {c.synopsis}</p>
      <Message msg={msg} />
      <Card title="Owners">
        <Table rows={data.owners} cols={[['name', 'Creator'], ['role', 'Role'], ['ownership_percentage', 'Share %']]} />
      </Card>
      <Card title="Licences">
        <Table rows={data.licenses} cols={[
          ['license_id', '#'], ['platform_name', 'Platform'], ['license_type', 'Type'], ['territories', 'Territories'],
          ['start_date', 'Start'], ['end_date', 'End'], ['royalty_rate', 'Rate'], ['status', 'Status', (r) => <Badge>{r.status}</Badge>],
        ]} />
      </Card>
      {me.data?.user.role === 'ADMIN' && <button className="btn bg-rose-600 hover:bg-rose-700" onClick={remove}>Delete work</button>}
    </>
  );
}
