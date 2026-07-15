DO $$
DECLARE
  approved_url_count INTEGER;
  untouched_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO approved_url_count
  FROM public.bot_templates
  WHERE template_id IN ('photo_auto', 'answer_done', 'create_done')
    AND 'URL' = ANY(variables)
    AND POSITION('{URL}' IN body) > 0
    AND approved_at IS NOT NULL
    AND approved_by = '末武修平';

  IF approved_url_count <> 3 THEN
    RAISE EXCEPTION 'expected 3 approved URL templates, got %', approved_url_count;
  END IF;

  SELECT COUNT(*)
  INTO untouched_count
  FROM public.bot_templates
  WHERE template_id IN ('photo_ask', 'correction_done', 'create_confirm', 'T-06', 'T-07')
    AND NOT ('URL' = ANY(variables))
    AND POSITION('{URL}' IN body) = 0;

  IF untouched_count <> 5 THEN
    RAISE EXCEPTION 'non-URL templates changed unexpectedly';
  END IF;

  RAISE NOTICE 'approved URL template assertions passed';
END;
$$;
