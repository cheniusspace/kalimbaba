-- ============================================================
-- Yankee Doodle — Tab Data
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  song_uuid UUID;
BEGIN
  SELECT id INTO song_uuid FROM public.songs WHERE slug = 'yankee-doodle';

  IF song_uuid IS NULL THEN
    INSERT INTO public.songs (title, slug, genre, difficulty, audience, is_published)
    VALUES ('Yankee Doodle', 'yankee-doodle', 'children', 'beginner', 'children', true)
    RETURNING id INTO song_uuid;
  END IF;

  -- Clear any existing tabs
  DELETE FROM public.tabs WHERE song_id = song_uuid;

  -- Insert tab lines
  INSERT INTO public.tabs (song_id, line_order, notes, syllables) VALUES

  -- Line 1: 1° 1° 2° 3° 1° 3° 2°
  -- "Yan-kee Doo-dle went to town"
  (song_uuid, 1,
    '[{"note":"1","octave":1},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"1","octave":1},{"note":"3","octave":1},{"note":"2","octave":1}]',
    '["Yan","-kee","Doo","-dle","went","to","town"]'),

  -- Line 2: 5 1° 1° 2° 3° 1° 7
  -- "A ri-ding on a po-ny"
  (song_uuid, 2,
    '[{"note":"5","octave":0},{"note":"1","octave":1},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"1","octave":1},{"note":"7","octave":0}]',
    '["A","ri","-ding","on","a","po","-ny"]'),

  -- Line 3: 1° 1° 2° 3° 4° 3° 2°
  -- "Stuck a fea-ther in his cap"
  (song_uuid, 3,
    '[{"note":"1","octave":1},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"4","octave":1},{"note":"3","octave":1},{"note":"2","octave":1}]',
    '["Stuck","a","fea","-ther","in","his","cap"]'),

  -- Line 4: 1° 7 5 6 7 1° 1°
  -- "And called it ma-ca-ro-ni"
  (song_uuid, 4,
    '[{"note":"1","octave":1},{"note":"7","octave":0},{"note":"5","octave":0},{"note":"6","octave":0},{"note":"7","octave":0},{"note":"1","octave":1},{"note":"1","octave":1}]',
    '["And","called","it","ma","-ca","-ro","-ni"]'),

  -- Line 5: 6 7 6 5 6 7 1°
  -- "Yan-kee Doo-dle keep it up"
  (song_uuid, 5,
    '[{"note":"6","octave":0},{"note":"7","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},{"note":"6","octave":0},{"note":"7","octave":0},{"note":"1","octave":1}]',
    '["Yan","-kee","Doo","-dle","keep","it","up"]'),

  -- Line 6: 5 6 5 4 3 5
  -- "Yan-kee Doo-dle dan-dy"
  (song_uuid, 6,
    '[{"note":"5","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},{"note":"4","octave":0},{"note":"3","octave":0},{"note":"5","octave":0}]',
    '["Yan","-kee","Doo","-dle","dan","-dy"]'),

  -- Line 7: 6 7 6 5 6 7 1°
  -- "Mind the mu-sic and the step"
  (song_uuid, 7,
    '[{"note":"6","octave":0},{"note":"7","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},{"note":"6","octave":0},{"note":"7","octave":0},{"note":"1","octave":1}]',
    '["Mind","the","mu","-sic","and","the","step"]'),

  -- Line 8: 6 5 1° 7 2° 1° 1°
  -- "And with the girls be han-dy"
  (song_uuid, 8,
    '[{"note":"6","octave":0},{"note":"5","octave":0},{"note":"1","octave":1},{"note":"7","octave":0},{"note":"2","octave":1},{"note":"1","octave":1},{"note":"1","octave":1}]',
    '["And","with","the","girls","be","han","-dy"]');

  RAISE NOTICE 'Done! Inserted 8 tab lines for Yankee Doodle (id: %)', song_uuid;
END $$;
