import { Sidebar } from '@/components/admin/sidebar';
import { Header } from '@/components/admin/header';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthUser();
  const role = user?.role || 'partner';

  return (
    <div className="min-h-screen bg-[#f2efe7] tracking-normal">
      <Sidebar role={role} />
      <div className="min-h-screen pt-16 lg:pl-72 lg:pt-0">
        <Header role={role} />
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
