'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bell, User as UserIcon } from 'lucide-react';

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        {/* Breadcrumb or page title can go here */}
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User info */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">{user?.email || 'Loading...'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
