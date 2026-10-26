'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  ['/dashboard', 'Dashboard', 'ALL'],
  ['/content', 'Content', 'ALL'],
  ['/licenses', 'Licences', 'ALL'],
  ['/usage', 'Usage reports', 'ADMIN'],
  ['/creators', 'Creators', 'ADMIN'],
  ['/platforms', 'Platforms', 'ADMIN'],
  ['/royalties', 'Royalties', 'ALL'],
  ['/payments', 'Payments', 'ALL'],
];

export function Nav({ email, role }: { email: string; role: string }) {
  const path = usePathname();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <span className="font-semibold text-indigo-700">Royalty Platform</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.filter(([, , r]) => r === 'ALL' || r === role).map(([href, label]) => (
            <Link key={href} href={href}
              className={`rounded px-3 py-1.5 text-sm ${path.startsWith(href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              {label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto text-xs text-slate-500">{email} ({role})</span>
        <button onClick={logout} className="btn-light">Sign out</button>
      </div>
    </header>
  );
}
