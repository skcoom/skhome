'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  MessageSquare,
  LogOut,
  Home,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: '現場管理', href: '/projects', icon: FolderKanban },
  { name: 'ブログ管理', href: '/admin/blog', icon: FileText },
  { name: 'ユーザー管理', href: '/users', icon: Users },
  { name: 'お問い合わせ', href: '/contacts', icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-white">SKHOME</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-gray-800 p-4 space-y-2">
        <Link
          href="/"
          className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Home className="mr-3 h-5 w-5" />
          ホームページを見る
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          ログアウト
        </button>
      </div>
    </div>
  );
}
