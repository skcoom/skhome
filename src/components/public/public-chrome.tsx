'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/public/header';
import { Footer } from '@/components/public/footer';
import { LineFloatingButton } from '@/components/ui/line-floating-button';

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <LineFloatingButton />
    </div>
  );
}
