import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { LineFloatingButton } from '@/components/ui/LineFloatingButton';

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
