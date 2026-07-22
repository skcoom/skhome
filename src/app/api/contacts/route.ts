import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { contactFormSchema, formatZodErrors, sanitizeInput } from '@/lib/validations';
import { sendContactNotification } from '@/lib/email';
import { requirePermission } from '@/lib/auth';
import { randomUUID } from 'crypto';

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

    // スパム対策: Honeypotチェック
    // ボットは隠しフィールドも自動入力するため、値があればスパム
    if (body.website) {
      console.log('[Spam Blocked] Honeypot triggered:', clientIP);
      // 成功を装ってボットに検知されないようにする
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // スパム対策: 送信時間チェック
    // 人間は3秒以内にフォームを入力できない
    const MIN_SUBMISSION_TIME_MS = 3000;
    if (body._timestamp) {
      const submissionTime = Date.now() - body._timestamp;
      if (submissionTime < MIN_SUBMISSION_TIME_MS) {
        console.log('[Spam Blocked] Too fast submission:', submissionTime, 'ms from', clientIP);
        return NextResponse.json({ success: true }, { status: 201 });
      }
    }

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

    const contactId = randomUUID();
    const { error } = await supabase
      .from('contacts')
      .insert({ id: contactId, ...sanitizedData });

    if (error) {
      console.error('Contact insert error:', error);
      return NextResponse.json({ error: 'お問い合わせの送信に失敗しました' }, { status: 500 });
    }

    // 通知を送信（失敗してもお問い合わせは成功扱い）
    const notificationData = {
      id: contactId,
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      message: sanitizedData.message,
    };

    // サーバーレス環境でも処理が途中で終了しないよう、通知送信の完了を待つ。
    try {
      await sendContactNotification(notificationData);
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }

    return NextResponse.json(
      { success: true },
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
