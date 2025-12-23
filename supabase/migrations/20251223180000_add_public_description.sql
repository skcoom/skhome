-- 公開用概要フィールドを追加
-- description: 管理者向けの詳細メモ（価格、資材コード等含む）
-- public_description: 公開ページ向けのお客様向け文章

ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_description TEXT;

-- 既存データがある場合、descriptionをpublic_descriptionにコピー
UPDATE projects
SET public_description = description
WHERE description IS NOT NULL AND public_description IS NULL;

COMMENT ON COLUMN projects.description IS '管理者向け詳細メモ（価格、資材情報含む）';
COMMENT ON COLUMN projects.public_description IS '公開ページ向けお客様向け概要文';
