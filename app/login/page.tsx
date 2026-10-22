'use client';

import { useState } from 'react';
import { api } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/auth/login', 'POST', { email, password });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-semibold">Royalty Platform — Sign in</h1>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <label className="block"><span className="label">E-mail</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="block"><span className="label">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn w-full">Sign in</button>
        <p className="text-xs text-slate-500">
          Demo (password <b>Password@123</b>):<br />
          Admin: admin@royalty.example.com<br />
          Creator: aarav@creators.example.com
        </p>
      </form>
    </div>
  );
}
