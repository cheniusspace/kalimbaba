-- ============================================================
-- Three Little Kittens — Tab Data
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  song_uuid UUID;
BEGIN
  SELECT id INTO song_uuid FROM public.songs WHERE slug = 'three-little-kittens';

  IF song_uuid IS NULL THEN
    INSERT INTO public.songs (title, slug, genre, difficulty, audience, is_published)
    VALUES ('Three Little Kittens', 'three-little-kittens', 'children', 'beginner', 'children', true)
    RETURNING id INTO song_uuid;
  END IF;

  -- Clear any existing tabs
  DELETE FROM public.tabs WHERE song_id = song_uuid;

  -- Insert tab lines
  INSERT INTO public.tabs (song_id, line_order, notes, syllables) VALUES

  -- Line 1: 1° 1° 3° 5 5 5 1° 3° 5 5
  -- "Three lit- tle kit- tens, they lost their mit- tens"
  (song_uuid, 1,
    '[{"note":"1","octave":true},{"note":"1","octave":true},{"note":"3","octave":true},{"note":"5","octave":false},{"note":"5","octave":false},{"note":"5","octave":false},{"note":"1","octave":true},{"note":"3","octave":true},{"note":"5","octave":false},{"note":"5","octave":false}]',
    '["Three","lit-","tle","kit-","tens,","they","lost","their","mit-","tens"]'),

  -- Line 2: 5 3° 1° 2° 7 1°
  -- "And they be- gan to cry"
  (song_uuid, 2,
    '[{"note":"5","octave":false},{"note":"3","octave":true},{"note":"1","octave":true},{"note":"2","octave":true},{"note":"7","octave":false},{"note":"1","octave":true}]',
    '["And","they","be-","gan","to","cry"]'),

  -- Line 3: 5 1° 3° 5 5 1° 3° 5
  -- "Oh, mo- ther dear, we sad- ly fear"
  (song_uuid, 3,
    '[{"note":"5","octave":false},{"note":"1","octave":true},{"note":"3","octave":true},{"note":"5","octave":false},{"note":"5","octave":false},{"note":"1","octave":true},{"note":"3","octave":true},{"note":"5","octave":false}]',
    '["Oh,","mo-","ther","dear,","we","sad-","ly","fear"]'),

  -- Line 4: 5 3° 1° 2° 7 1°
  -- "We've lost our mit- tens by"
  (song_uuid, 4,
    '[{"note":"5","octave":false},{"note":"3","octave":true},{"note":"1","octave":true},{"note":"2","octave":true},{"note":"7","octave":false},{"note":"1","octave":true}]',
    '["We'\''ve","lost","our","mit-","tens","by"]'),

  -- Line 5: 3 1° 7 6 6 3 1° 7 6 6
  -- "What! Lost your mit- tens? You naugh- ty kit- tens"
  (song_uuid, 5,
    '[{"note":"3","octave":false},{"note":"1","octave":true},{"note":"7","octave":false},{"note":"6","octave":false},{"note":"6","octave":false},{"note":"3","octave":false},{"note":"1","octave":true},{"note":"7","octave":false},{"note":"6","octave":false},{"note":"6","octave":false}]',
    '["What!","Lost","your","mit-","tens?","You","naugh-","ty","kit-","tens"]'),

  -- Line 6: 6 7 7 3° 3° 6
  -- "Then you shall have no pie"
  (song_uuid, 6,
    '[{"note":"6","octave":false},{"note":"7","octave":false},{"note":"7","octave":false},{"note":"3","octave":true},{"note":"3","octave":true},{"note":"6","octave":false}]',
    '["Then","you","shall","have","no","pie"]'),

  -- Line 7: 2° 7 2° 7 3° 1°
  -- "Meow, Meow, Meow, Meow"
  (song_uuid, 7,
    '[{"note":"2","octave":true},{"note":"7","octave":false},{"note":"2","octave":true},{"note":"7","octave":false},{"note":"3","octave":true},{"note":"1","octave":true}]',
    '["Meow,","Meow,","Meow,","Meow","",""]');

  RAISE NOTICE 'Done! Inserted 7 tab lines for Three Little Kittens (id: %)', song_uuid;
END $$;
