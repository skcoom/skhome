'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Calculator,
  FileText,
  FolderKanban,
  Home,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const navigation = [
  { name: '今日の現場', href: '/admin/dashboard', icon: LayoutDashboard, primary: true, roles: ['admin', 'staff', 'partner'] },
  { name: 'LINE写真・AI', href: '/admin/genba', icon: Images, primary: true, roles: ['admin', 'staff'] },
  { name: 'すべての現場', href: '/admin/projects', icon: FolderKanban, primary: true, roles: ['admin', 'staff', 'partner'] },
  { name: '利益管理', href: '/admin/profit', icon: Calculator, roles: ['admin'] },
  { name: '発注先管理', href: '/admin/suppliers', icon: Truck, roles: ['admin', 'staff'] },
  { name: '追加工事マスタ', href: '/admin/additional-works', icon: Wrench, roles: ['admin', 'staff'] },
  { name: 'ブログ管理', href: '/admin/blog', icon: FileText, roles: ['admin', 'staff'] },
  { name: 'ユーザー管理', href: '/admin/users', icon: Users, roles: ['admin'] },
  { name: 'お問い合わせ', href: '/admin/contacts', icon: MessageSquare, roles: ['admin', 'staff'] },
  { name: 'サイト設定', href: '/admin/settings', icon: Settings, roles: ['admin'] },
];

function SidebarPanel({ role, close }: { role: UserRole; close?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visibleNavigation = navigation.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex h-full flex-col bg-[#24221d] text-[#f7f3e9]">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin/dashboard" onClick={close} className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Image src="/logo-icon.png" alt="" width={30} height={30} className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.16em]">SKHOME</span>
            <span className="block text-[10px] tracking-[0.14em] text-white/50">現場運用</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="管理メニュー">
        <p className="px-3 pb-2 text-[10px] font-medium tracking-[0.18em] text-white/35">現場</p>
        <div className="space-y-1">
          {visibleNavigation.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(`${item.href}/`));
            const startsSecondary = index === visibleNavigation.findIndex((nav) => !nav.primary);
            return (
              <div key={item.href}>
                {startsSecondary && (
                  <p className="mt-6 border-t border-white/10 px-3 pb-2 pt-5 text-[10px] font-medium tracking-[0.18em] text-white/35">
                    管理
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={close}
                  className={`flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[#176f64] text-white shadow-sm'
                      : 'text-white/68 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-[18px] w-[18px]" />
                  {item.name}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={close}
          className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm text-white/65 hover:bg-white/8 hover:text-white"
        >
          <Home className="mr-3 h-[18px] w-[18px]" />
          公開サイトを見る
        </Link>
        <button
          onClick={handleSignOut}
          className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-sm text-white/65 hover:bg-white/8 hover:text-white"
        >
          <LogOut className="mr-3 h-[18px] w-[18px]" />
          ログアウト
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarPanel role={role} />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[#ddd7c8] bg-[#f8f5ee]/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-[0.12em] text-[#2c2923]">SKHOME</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d8d1c1] bg-white text-[#2c2923]"
          aria-label="管理メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/45"
            onClick={() => setOpen(false)}
            aria-label="管理メニューを閉じる"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,320px)] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
              aria-label="管理メニューを閉じる"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarPanel role={role} close={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
