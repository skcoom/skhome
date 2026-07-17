import { Sidebar } from '@/components/admin/sidebar';
import { Header } from '@/components/admin/header';

export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f2efe7] tracking-normal">
      <Sidebar />
      <div className="min-h-screen pt-16 lg:pl-72 lg:pt-0">
        <Header />
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
