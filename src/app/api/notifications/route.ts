import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Notification {
  id: string;
  type: 'contact';
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

// 通知一覧取得（スタッフ以上）
export async function GET() {
  try {
    // 権限チェック
    const { user, error: authError } = await requireStaff();
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    const notifications: Notification[] = [];

    // 未対応のお問い合わせを取得
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, message, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (contacts) {
      contacts.forEach((contact) => {
        notifications.push({
          id: `contact-${contact.id}`,
          type: 'contact',
          title: '新しいお問い合わせ',
          message: `${contact.name}様からのお問い合わせ`,
          link: '/admin/contacts',
          createdAt: contact.created_at,
        });
      });
    }

    // 未対応のお問い合わせ数をカウント
    const { count: unreadCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
