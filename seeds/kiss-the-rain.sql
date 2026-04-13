-- ============================================================
-- Kiss the Rain — Tab Data
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  song_uuid UUID;
BEGIN
  SELECT id INTO song_uuid FROM public.songs WHERE slug = 'kiss-the-rain';

  IF song_uuid IS NULL THEN
    INSERT INTO public.songs (title, slug, genre, difficulty, audience, is_published)
    VALUES ('Kiss the Rain', 'kiss-the-rain', 'pop', 'intermediate', 'all', true)
    RETURNING id INTO song_uuid;
  END IF;

  -- Clear any existing tabs
  DELETE FROM public.tabs WHERE song_id = song_uuid;

  -- Insert tab lines (instrumental — no lyrics)
  INSERT INTO public.tabs (song_id, line_order, notes, syllables) VALUES

  -- Line 1: 5  1°  2°  2°  3°  3°
  (song_uuid, 1,
    '[{"note":"5","octave":0},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1}]',
    '["","","","","",""]'),

  -- Line 2: 1°  2°  3°  2°  5°  5°
  (song_uuid, 2,
    '[{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}]',
    '["","","","","",""]'),

  -- Line 3: 5°  6°  7°  7°  1°°  1°°
  (song_uuid, 3,
    '[{"note":"5","octave":1},{"note":"6","octave":1},{"note":"7","octave":1},{"note":"7","octave":1},{"note":"1","octave":2},{"note":"1","octave":2}]',
    '["","","","","",""]'),

  -- Line 4: 2°°  3°°  2°°  1°°  7°
  (song_uuid, 4,
    '[{"note":"2","octave":2},{"note":"3","octave":2},{"note":"2","octave":2},{"note":"1","octave":2},{"note":"7","octave":1}]',
    '["","","","",""]'),

  -- Line 5: 1°°  7°  5°  5°  6°  6°
  (song_uuid, 5,
    '[{"note":"1","octave":2},{"note":"7","octave":1},{"note":"5","octave":1},{"note":"5","octave":1},{"note":"6","octave":1},{"note":"6","octave":1}]',
    '["","","","","",""]'),

  -- Line 6: 5°  4°  4°  5°  5°
  (song_uuid, 6,
    '[{"note":"5","octave":1},{"note":"4","octave":1},{"note":"4","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}]',
    '["","","","",""]'),

  -- Line 7: 1°  2°  3°  3°  4°  4°
  (song_uuid, 7,
    '[{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"4","octave":1},{"note":"4","octave":1}]',
    '["","","","","",""]'),

  -- Line 8: 5°  4°  3°  3°  2°  4°
  (song_uuid, 8,
    '[{"note":"5","octave":1},{"note":"4","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"4","octave":1}]',
    '["","","","","",""]'),

  -- Line 9: 5  1°  2°  2°  3°  3°  (repeat)
  (song_uuid, 9,
    '[{"note":"5","octave":0},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1}]',
    '["","","","","",""]'),

  -- Line 10: 1°  2°  3°  2°  5°  5°  (repeat)
  (song_uuid, 10,
    '[{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}]',
    '["","","","","",""]'),

  -- Line 11: 5°  6°  7°  7°  1°°  1°°  (repeat)
  (song_uuid, 11,
    '[{"note":"5","octave":1},{"note":"6","octave":1},{"note":"7","octave":1},{"note":"7","octave":1},{"note":"1","octave":2},{"note":"1","octave":2}]',
    '["","","","","",""]'),

  -- Line 12: 2°°  3°°  2°°  1°°  7°  (repeat)
  (song_uuid, 12,
    '[{"note":"2","octave":2},{"note":"3","octave":2},{"note":"2","octave":2},{"note":"1","octave":2},{"note":"7","octave":1}]',
    '["","","",""]'),

  -- Line 13: 1°°  7°  5°  5°  6°  6°  (repeat)
  (song_uuid, 13,
    '[{"note":"1","octave":2},{"note":"7","octave":1},{"note":"5","octave":1},{"note":"5","octave":1},{"note":"6","octave":1},{"note":"6","octave":1}]',
    '["","","","","",""]'),

  -- Line 14: 5°  4°  4°  5°  5°  (repeat)
  (song_uuid, 14,
    '[{"note":"5","octave":1},{"note":"4","octave":1},{"note":"4","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}]',
    '["","","","",""]'),

  -- Line 15: 1°  2°  3°  3°  4°  4°  (repeat)
  (song_uuid, 15,
    '[{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"4","octave":1},{"note":"4","octave":1}]',
    '["","","","","",""]'),

  -- Line 16: 6  1°  7  1°
  (song_uuid, 16,
    '[{"note":"6","octave":0},{"note":"1","octave":1},{"note":"7","octave":0},{"note":"1","octave":1}]',
    '["","","",""]');

  RAISE NOTICE 'Done! Inserted 16 tab lines for Kiss the Rain (id: %)', song_uuid;
END $$;
