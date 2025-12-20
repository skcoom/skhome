-- ファーストビュー表示位置カラムを追加
ALTER TABLE project_media
ADD COLUMN hero_position INTEGER DEFAULT NULL;

-- hero_positionは1, 2, 3のいずれかのみ許可
ALTER TABLE project_media
ADD CONSTRAINT hero_position_check CHECK (hero_position IS NULL OR hero_position IN (1, 2, 3));

-- hero_positionのユニーク制約（同じ位置に複数のメディアを設定できない）
CREATE UNIQUE INDEX hero_position_unique ON project_media (hero_position) WHERE hero_position IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN project_media.hero_position IS 'ファーストビュー表示位置（1, 2, 3）。NULLは非表示';
