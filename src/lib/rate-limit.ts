/**
 * Supabase永続化Rate Limiter
 *
 * サーバーレス環境（Vercel等）でも正常に動作します。
 * rate_limitsテーブルにデータを保存し、複数インスタンス間で共有されます。
 */

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアント（認証不要のため直接作成）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface RateLimitConfig {
  /** 許可するリクエスト数 */
  limit: number;
  /** ウィンドウサイズ（ミリ秒） */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Rate Limitチェックを行う（Supabase永続化版）
 * @param key 識別キー（通常はIPアドレスや`${ip}:${endpoint}`形式）
 * @param config Rate Limit設定
 * @returns Rate Limit結果
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();

  try {
    // 既存のエントリを取得
    const { data: existingEntry, error: selectError } = await supabase
      .from('rate_limits')
      .select('count, reset_time')
      .eq('key', key)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116: 結果が0件の場合のエラー（正常）
      console.error('Rate limit check error:', selectError);
      // DBエラー時は許可（サービス継続を優先）
      return { success: true, remaining: config.limit - 1, resetTime: now + config.windowMs };
    }

    const resetTimeMs = existingEntry?.reset_time
      ? new Date(existingEntry.reset_time).getTime()
      : 0;

    if (!existingEntry || now > resetTimeMs) {
      // 新しいウィンドウを開始（エントリがない、またはリセット時刻を過ぎている）
      const newResetTime = new Date(now + config.windowMs).toISOString();

      const { error: upsertError } = await supabase
        .from('rate_limits')
        .upsert(
          { key, count: 1, reset_time: newResetTime },
          { onConflict: 'key' }
        );

      if (upsertError) {
        console.error('Rate limit upsert error:', upsertError);
        return { success: true, remaining: config.limit - 1, resetTime: now + config.windowMs };
      }

      return {
        success: true,
        remaining: config.limit - 1,
        resetTime: now + config.windowMs,
      };
    }

    if (existingEntry.count >= config.limit) {
      // Rate Limit超過
      return {
        success: false,
        remaining: 0,
        resetTime: resetTimeMs,
      };
    }

    // カウントを増やす
    const newCount = existingEntry.count + 1;
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: newCount })
      .eq('key', key);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
    }

    return {
      success: true,
      remaining: config.limit - newCount,
      resetTime: resetTimeMs,
    };
  } catch (error) {
    console.error('Rate limit unexpected error:', error);
    // 予期せぬエラー時は許可（サービス継続を優先）
    return { success: true, remaining: config.limit - 1, resetTime: now + config.windowMs };
  }
}

/**
 * 期限切れのRate Limitエントリをクリーンアップ
 * 定期実行（Cron等）で呼び出すことを推奨
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('reset_time', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Rate limit cleanup error:', error);
      return 0;
    }

    return data?.length ?? 0;
  } catch (error) {
    console.error('Rate limit cleanup unexpected error:', error);
    return 0;
  }
}

/**
 * IPアドレスを取得する
 * @param request NextRequest
 * @returns IPアドレス
 */
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare等のプロキシ経由のIPを取得
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // フォールバック
  return 'unknown';
}

// 事前定義されたRate Limit設定
export const RATE_LIMITS = {
  // お問い合わせフォーム: 1時間に5回まで
  contact: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1時間
  },
  // 一般的なAPI: 1分に60回まで
  api: {
    limit: 60,
    windowMs: 60 * 1000, // 1分
  },
  // 認証関連: 15分に10回まで
  auth: {
    limit: 10,
    windowMs: 15 * 60 * 1000, // 15分
  },
} as const;
