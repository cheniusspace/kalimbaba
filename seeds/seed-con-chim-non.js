const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://tmomvnyqpfxsninxvvin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtb212bnlxcGZ4c25pbnh2dmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzMxOTYsImV4cCI6MjA5MDUwOTE5Nn0._PtBNEg8nztzEfuMwzwtrz8EAoKu6AFkqw1Q3BTxjy4'
)

// Con Chim Non — 17-key kalimba tab
// ° = octave 1 (upper register), no mark = octave 0 (lower register)
const TABS = [
  // Line 1: 1° 1° 1° 5 3 5 — Con chim non trên cành hoa
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"1","octave":1},
      {"note":"5","octave":0},{"note":"3","octave":0},{"note":"5","octave":0}
    ],
    syllables: ["Con","chim","non","trên","cành","hoa"]
  },
  // Line 2: 3° 3° 2° 2° 2° 1° — Hót véo von hót véo von
  {
    notes: [
      {"note":"3","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},
      {"note":"2","octave":1},{"note":"2","octave":1},{"note":"1","octave":1}
    ],
    syllables: ["Hót","véo","von","hót","véo","von"]
  },
  // Line 3: 1° 1° 1° 2° 3° 2° — Em yêu chim em mến chim
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"1","octave":1},
      {"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1}
    ],
    syllables: ["Em","yêu","chim","em","mến","chim"]
  },
  // Line 4: 5 6 5 2° 3° 2° 1° — Vì mỗi lần chim hót em vui
  {
    notes: [
      {"note":"5","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},
      {"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},
      {"note":"1","octave":1}
    ],
    syllables: ["Vì","mỗi","lần","chim","hót","em","vui"]
  },
  // Line 5: 1° 1° 1° 5 3 5 — Chim ơi chim, chim đừng bay
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"1","octave":1},
      {"note":"5","octave":0},{"note":"3","octave":0},{"note":"5","octave":0}
    ],
    syllables: ["Chim","ơi","chim,","chim","đừng","bay"]
  },
  // Line 6: 3° 3° 2° 2° 2° 1° — Hót nữa đi, hót nữa đi
  {
    notes: [
      {"note":"3","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},
      {"note":"2","octave":1},{"note":"2","octave":1},{"note":"1","octave":1}
    ],
    syllables: ["Hót","nữa","đi,","hót","nữa","đi"]
  },
  // Line 7: 1° 1° 1° 2° 3° 2° — Em yêu chim em mến chim
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"1","octave":1},
      {"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1}
    ],
    syllables: ["Em","yêu","chim","em","mến","chim"]
  },
  // Line 8: 5 6 5 2° 3° 2° 1° — Vì mỗi lần chim hót em vui
  {
    notes: [
      {"note":"5","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},
      {"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},
      {"note":"1","octave":1}
    ],
    syllables: ["Vì","mỗi","lần","chim","hót","em","vui"]
  },
]

async function seed() {
  // Upsert song
  let { data: existing } = await supabase.from('songs').select('id').eq('slug', 'con-chim-non').single()
  let songId = existing?.id

  if (!songId) {
    const { data, error } = await supabase.from('songs').insert({
      title: 'Con Chim Non',
      slug: 'con-chim-non',
      genre: 'children',
      difficulty: 'beginner',
      is_published: true,
    }).select('id').single()
    if (error) { console.error('Song insert failed:', error.message); process.exit(1) }
    songId = data.id
    console.log('Created song:', songId)
  } else {
    console.log('Song already exists:', songId)
  }

  // Clear existing tabs
  await supabase.from('tabs').delete().eq('song_id', songId)

  // Insert tabs
  const inserts = TABS.map((t, i) => ({
    song_id: songId,
    line_order: i + 1,
    notes: t.notes,
    syllables: t.syllables,
  }))

  const { error } = await supabase.from('tabs').insert(inserts)
  if (error) { console.error('Tabs insert failed:', error.message); process.exit(1) }

  console.log(`Done! Inserted ${TABS.length} tab lines for Con Chim Non`)
}

seed()
