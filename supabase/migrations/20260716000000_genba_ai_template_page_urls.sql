-- 現場ページ生成基盤の稼働後、承認済み完了文面3種へ署名付きURLを追加する。
-- 2026-07-16 末武修平承認。

BEGIN;

UPDATE public.bot_templates
SET
  body = CASE template_id
    WHEN 'photo_auto' THEN E'📷 写真{count}枚を「{site}」の記録として保存しました。\n違う現場のときは「訂正 エトワール905」のように返信してください。\n現場ページ → {URL}'
    WHEN 'answer_done' THEN E'✅ 「{site}」の記録として保存しました。\n現場ページ → {URL}'
    WHEN 'create_done' THEN E'✅ 新しい現場「{name}」を登録し、写真を保存しました。\n現場ページ → {URL}'
  END,
  variables = CASE template_id
    WHEN 'photo_auto' THEN ARRAY['count', 'site', 'URL']::TEXT[]
    WHEN 'answer_done' THEN ARRAY['site', 'URL']::TEXT[]
    WHEN 'create_done' THEN ARRAY['name', 'URL']::TEXT[]
  END
WHERE template_id IN ('photo_auto', 'answer_done', 'create_done');

UPDATE public.bot_templates
SET
  approved_at = NOW(),
  approved_by = '末武修平'
WHERE template_id IN ('photo_auto', 'answer_done', 'create_done');

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM public.bot_templates
  WHERE template_id IN ('photo_auto', 'answer_done', 'create_done')
    AND (
      NOT ('URL' = ANY(variables))
      OR POSITION('{URL}' IN body) = 0
      OR approved_at IS NULL
      OR approved_by <> '末武修平'
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'URL template approval verification failed for % rows', invalid_count;
  END IF;
END;
$$;

COMMIT;
