import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { Nav } from '@/components/nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  return (
    <>
      <Nav email={session.email} role={session.role} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
