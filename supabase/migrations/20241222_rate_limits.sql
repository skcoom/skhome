-- Rate Limit 永続化用テーブル
-- サーバーレス環境でも動作するよう、Supabaseに保存

-- テーブル作成
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- keyカラムにインデックスを作成（高速検索用）
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- reset_timeにインデックスを作成（クリーンアップ用）
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);

-- RLS（Row Level Security）を有効化
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーからのアクセスを許可（内部API用）
CREATE POLICY "rate_limits_all_access" ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 古いエントリを自動削除する関数
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_time < NOW();
END;
$$;

-- コメント追加
COMMENT ON TABLE rate_limits IS 'API Rate Limit用の永続化テーブル';
COMMENT ON COLUMN rate_limits.key IS '識別キー（IP:endpoint形式）';
COMMENT ON COLUMN rate_limits.count IS '現在のリクエスト数';
COMMENT ON COLUMN rate_limits.reset_time IS 'リセット時刻';
