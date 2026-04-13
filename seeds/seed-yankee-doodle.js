const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://tmomvnyqpfxsninxvvin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtb212bnlxcGZ4c25pbnh2dmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzMxOTYsImV4cCI6MjA5MDUwOTE5Nn0._PtBNEg8nztzEfuMwzwtrz8EAoKu6AFkqw1Q3BTxjy4'
)

// Yankee Doodle — 17-key kalimba tab
// Notes with octave:1 are marked ° in the score (upper register)
const TABS = [
  // Line 1: 1° 1° 2° 3° 1° 3° 2°  — Yan-kee Doo-dle went to town
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"2","octave":1},
      {"note":"3","octave":1},{"note":"1","octave":1},{"note":"3","octave":1},
      {"note":"2","octave":1}
    ],
    syllables: ["Yan","-kee","Doo","-dle","went","to","town"]
  },
  // Line 2: 5 1° 1° 2° 3° 1° 7  — A ri-ding on a po-ny
  {
    notes: [
      {"note":"5","octave":0},{"note":"1","octave":1},{"note":"1","octave":1},
      {"note":"2","octave":1},{"note":"3","octave":1},{"note":"1","octave":1},
      {"note":"7","octave":0}
    ],
    syllables: ["A","ri","-ding","on","a","po","-ny"]
  },
  // Line 3: 1° 1° 2° 3° 4° 3° 2°  — Stuck a fea-ther in his cap
  {
    notes: [
      {"note":"1","octave":1},{"note":"1","octave":1},{"note":"2","octave":1},
      {"note":"3","octave":1},{"note":"4","octave":1},{"note":"3","octave":1},
      {"note":"2","octave":1}
    ],
    syllables: ["Stuck","a","fea","-ther","in","his","cap"]
  },
  // Line 4: 1° 7 5 6 7 1° 1°  — And called it ma-ca-ro-ni
  {
    notes: [
      {"note":"1","octave":1},{"note":"7","octave":0},{"note":"5","octave":0},
      {"note":"6","octave":0},{"note":"7","octave":0},{"note":"1","octave":1},
      {"note":"1","octave":1}
    ],
    syllables: ["And","called","it","ma","-ca","-ro","-ni"]
  },
  // Line 5: 6 7 6 5 6 7 1°  — Yan-kee Doo-dle keep it up
  {
    notes: [
      {"note":"6","octave":0},{"note":"7","octave":0},{"note":"6","octave":0},
      {"note":"5","octave":0},{"note":"6","octave":0},{"note":"7","octave":0},
      {"note":"1","octave":1}
    ],
    syllables: ["Yan","-kee","Doo","-dle","keep","it","up"]
  },
  // Line 6: 5 6 5 4 3 5  — Yan-kee Doo-dle dan-dy
  {
    notes: [
      {"note":"5","octave":0},{"note":"6","octave":0},{"note":"5","octave":0},
      {"note":"4","octave":0},{"note":"3","octave":0},{"note":"5","octave":0}
    ],
    syllables: ["Yan","-kee","Doo","-dle","dan","-dy"]
  },
  // Line 7: 6 7 6 5 6 7 1°  — Mind the mu-sic and the step
  {
    notes: [
      {"note":"6","octave":0},{"note":"7","octave":0},{"note":"6","octave":0},
      {"note":"5","octave":0},{"note":"6","octave":0},{"note":"7","octave":0},
      {"note":"1","octave":1}
    ],
    syllables: ["Mind","the","mu","-sic","and","the","step"]
  },
  // Line 8: 6 5 1° 7 2° 1° 1°  — And with the girls be han-dy
  {
    notes: [
      {"note":"6","octave":0},{"note":"5","octave":0},{"note":"1","octave":1},
      {"note":"7","octave":0},{"note":"2","octave":1},{"note":"1","octave":1},
      {"note":"1","octave":1}
    ],
    syllables: ["And","with","the","girls","be","han","-dy"]
  },
]

async function seed() {
  // Upsert song
  let { data: existing } = await supabase.from('songs').select('id').eq('slug', 'yankee-doodle').single()
  let songId = existing?.id

  if (!songId) {
    const { data, error } = await supabase.from('songs').insert({
      title: 'Yankee Doodle',
      slug: 'yankee-doodle',
      genre: 'children',
      difficulty: 'beginner',
      audience: 'children',
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

  console.log(`Done! Inserted ${TABS.length} tab lines for Yankee Doodle`)
}

seed()
