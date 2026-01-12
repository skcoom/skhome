import { Header } from '@/components/public/header';
import { Footer } from '@/components/public/footer';
import { LineFloatingButton } from '@/components/ui/line-floating-button';

export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <LineFloatingButton />
    </div>
  );
}
