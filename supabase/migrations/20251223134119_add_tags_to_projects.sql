-- projectsテーブルにtagsカラムを追加
ALTER TABLE projects ADD COLUMN tags text[] DEFAULT '{}';

-- 既存データを移行（全て「住宅」タグを付与）
UPDATE projects SET tags = ARRAY['住宅'] WHERE category IS NOT NULL;

-- categoryカラムは互換性のため残す（将来削除可能）
COMMENT ON COLUMN projects.category IS '非推奨: tagsカラムを使用してください';
