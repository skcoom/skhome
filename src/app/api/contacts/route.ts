import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { contactFormSchema, formatZodErrors, sanitizeInput } from '@/lib/validations';
import { sendContactNotification, sendDiscordNotification } from '@/lib/email';
import { requirePermission } from '@/lib/auth';

// お問い合わせ一覧取得（スタッフ以上）
export async function GET() {
  try {
    // 権限チェック
    const { user, error: authError } = await requirePermission('contacts:read');
    if (authError || !user) {
      return NextResponse.json(
        { error: authError || '認証が必要です' },
        { status: authError?.includes('権限') ? 403 : 401 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Contacts fetch error:', error);
      return NextResponse.json({ error: 'お問い合わせの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Contacts API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// お問い合わせ送信（公開）
export async function POST(request: NextRequest) {
  try {
    // Rate Limitチェック
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      `contact:${clientIP}`,
      RATE_LIMITS.contact
    );

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'お問い合わせの送信回数が上限に達しました。しばらく経ってからお試しください。' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    // Zodバリデーション
    const validationResult = contactFormSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      return NextResponse.json(
        { error: errors[0], errors },
        { status: 400 }
      );
    }

    const { name, email, phone, message } = validationResult.data;

    // 入力値をサニタイズ
    const sanitizedData = {
      name: sanitizeInput(name.trim()),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      message: sanitizeInput(message.trim()),
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(sanitizedData)
      .select()
      .single();

    if (error) {
      console.error('Contact insert error:', error);
      return NextResponse.json({ error: 'お問い合わせの送信に失敗しました' }, { status: 500 });
    }

    // 通知を送信（失敗してもお問い合わせは成功扱い）
    const notificationData = {
      id: data.id,
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      message: sanitizedData.message,
    };

    // メール通知
    sendContactNotification(notificationData).catch((err) => {
      console.error('Failed to send email notification:', err);
    });

    // Discord通知
    sendDiscordNotification(notificationData).catch((err) => {
      console.error('Failed to send Discord notification:', err);
    });

    return NextResponse.json(
      { success: true, data },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
