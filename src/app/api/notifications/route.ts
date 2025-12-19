import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Notification {
  id: string;
  type: 'contact' | 'project' | 'blog';
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications: Notification[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // 1. 未対応のお問い合わせを取得
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, message, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (contacts) {
      contacts.forEach((contact) => {
        notifications.push({
          id: `contact-${contact.id}`,
          type: 'contact',
          title: '新しいお問い合わせ',
          message: `${contact.name}様からのお問い合わせ`,
          link: '/contacts',
          createdAt: contact.created_at,
        });
      });
    }

    // 2. 直近24時間以内に更新された現場を取得
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, updated_at')
      .gte('updated_at', twentyFourHoursAgo)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (projects) {
      projects.forEach((project) => {
        notifications.push({
          id: `project-${project.id}`,
          type: 'project',
          title: '現場が更新されました',
          message: project.name,
          link: `/projects/${project.id}`,
          createdAt: project.updated_at,
        });
      });
    }

    // 3. 直近24時間以内に作成されたブログ記事を取得
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('id, title, created_at')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (blogPosts) {
      blogPosts.forEach((post) => {
        notifications.push({
          id: `blog-${post.id}`,
          type: 'blog',
          title: '新しい記事',
          message: post.title,
          link: `/admin/blog/${post.id}`,
          createdAt: post.created_at,
        });
      });
    }

    // 日時順でソート（新しい順）
    notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 未対応のお問い合わせ数をカウント
    const { count: unreadCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      notifications: notifications.slice(0, 5),
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
