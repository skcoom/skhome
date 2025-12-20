/**
 * シンプルなインメモリRate Limiter
 *
 * 注意: この実装はサーバーレス環境では永続化されません。
 * 本番環境ではRedis等の外部ストレージを使用することを推奨します。
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // 1分ごとにクリーンアップ

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
 * Rate Limitチェックを行う
 * @param key 識別キー（通常はIPアドレスや`${ip}:${endpoint}`形式）
 * @param config Rate Limit設定
 * @returns Rate Limit結果
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // 新しいウィンドウを開始
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime,
    };
  }

  if (entry.count >= config.limit) {
    // Rate Limit超過
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // カウントを増やす
  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
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
