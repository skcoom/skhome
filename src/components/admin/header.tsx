'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Bell, User as UserIcon, Mail, Folder, FileText } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'contact' | 'project' | 'blog';
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  return `${diffDays}日前`;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'contact':
      return <Mail className="h-4 w-4 text-blue-500" />;
    case 'project':
      return <Folder className="h-4 w-4 text-green-500" />;
    case 'blog':
      return <FileText className="h-4 w-4 text-purple-500" />;
  }
}

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    // 30秒ごとに通知を更新
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        {/* Breadcrumb or page title can go here */}
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-white shadow-lg">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">通知</h3>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    通知はありません
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 border-b px-4 py-3 hover:bg-gray-50 last:border-b-0"
                    >
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="border-t px-4 py-2">
                  <Link
                    href="/contacts"
                    onClick={() => setIsOpen(false)}
                    className="block text-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    すべてのお問い合わせを見る
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

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
