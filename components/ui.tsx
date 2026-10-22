'use client';

import { useCallback, useEffect, useState } from 'react';

// Calls the backend API and throws the server's error message on failure
export async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.href = '/login';
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (url) api<T>(url).then(setData, (e) => setError(e.message));
  }, [url]);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

export const money = (v: unknown, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(v ?? 0));

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-6 p-5">
      {title && <h2 className="mb-4 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`mb-4 rounded-md border px-4 py-2 text-sm ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
      {msg.text}
    </div>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800', COMPLETED: 'bg-emerald-100 text-emerald-800', PROCESSED: 'bg-emerald-100 text-emerald-800',
    PENDING: 'bg-amber-100 text-amber-800', PROCESSING: 'bg-amber-100 text-amber-800', PARTIAL: 'bg-amber-100 text-amber-800', DRAFT: 'bg-slate-100 text-slate-700',
    FAILED: 'bg-rose-100 text-rose-800', REJECTED: 'bg-rose-100 text-rose-800', TERMINATED: 'bg-rose-100 text-rose-800',
    REVERSED: 'bg-rose-100 text-rose-800', EXPIRED: 'bg-slate-100 text-slate-500', SUSPENDED: 'bg-orange-100 text-orange-800',
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${colors[String(children)] ?? 'bg-indigo-100 text-indigo-800'}`}>{children}</span>;
}

export function Table({ rows, cols }: { rows: any[]; cols: [string, string, ((r: any) => React.ReactNode)?][] }) {
  if (!rows.length) return <p className="py-4 text-sm text-slate-400">No rows.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead><tr>{cols.map(([k, label]) => <th key={k}>{label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map(([k, , render]) => <td key={k}>{render ? render(r) : String(r[k] ?? '—')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
