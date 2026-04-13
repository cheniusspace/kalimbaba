const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://tmomvnyqpfxsninxvvin.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtb212bnlxcGZ4c25pbnh2dmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzMxOTYsImV4cCI6MjA5MDUwOTE5Nn0._PtBNEg8nztzEfuMwzwtrz8EAoKu6AFkqw1Q3BTxjy4'
)

const TABS = [
  { notes: [{"note":"5","octave":0},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1}] },
  { notes: [{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}] },
  { notes: [{"note":"5","octave":1},{"note":"6","octave":1},{"note":"7","octave":1},{"note":"7","octave":1},{"note":"1","octave":2},{"note":"1","octave":2}] },
  { notes: [{"note":"2","octave":2},{"note":"3","octave":2},{"note":"2","octave":2},{"note":"1","octave":2},{"note":"7","octave":1}] },
  { notes: [{"note":"1","octave":2},{"note":"7","octave":1},{"note":"5","octave":1},{"note":"5","octave":1},{"note":"6","octave":1},{"note":"6","octave":1}] },
  { notes: [{"note":"5","octave":1},{"note":"4","octave":1},{"note":"4","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}] },
  { notes: [{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"4","octave":1},{"note":"4","octave":1}] },
  { notes: [{"note":"5","octave":1},{"note":"4","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"4","octave":1}] },
  { notes: [{"note":"5","octave":0},{"note":"1","octave":1},{"note":"2","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1}] },
  { notes: [{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"2","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}] },
  { notes: [{"note":"5","octave":1},{"note":"6","octave":1},{"note":"7","octave":1},{"note":"7","octave":1},{"note":"1","octave":2},{"note":"1","octave":2}] },
  { notes: [{"note":"2","octave":2},{"note":"3","octave":2},{"note":"2","octave":2},{"note":"1","octave":2},{"note":"7","octave":1}] },
  { notes: [{"note":"1","octave":2},{"note":"7","octave":1},{"note":"5","octave":1},{"note":"5","octave":1},{"note":"6","octave":1},{"note":"6","octave":1}] },
  { notes: [{"note":"5","octave":1},{"note":"4","octave":1},{"note":"4","octave":1},{"note":"5","octave":1},{"note":"5","octave":1}] },
  { notes: [{"note":"1","octave":1},{"note":"2","octave":1},{"note":"3","octave":1},{"note":"3","octave":1},{"note":"4","octave":1},{"note":"4","octave":1}] },
  { notes: [{"note":"6","octave":0},{"note":"1","octave":1},{"note":"7","octave":0},{"note":"1","octave":1}] },
]

async function seed() {
  // Upsert song
  let { data: existing } = await supabase.from('songs').select('id').eq('slug', 'kiss-the-rain').single()
  let songId = existing?.id

  if (!songId) {
    const { data, error } = await supabase.from('songs').insert({
      title: 'Kiss the Rain',
      slug: 'kiss-the-rain',
      genre: 'pop',
      difficulty: 'intermediate',
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
    syllables: t.notes.map(() => ''),
  }))

  const { error } = await supabase.from('tabs').insert(inserts)
  if (error) { console.error('Tabs insert failed:', error.message); process.exit(1) }

  console.log(`Done! Inserted ${TABS.length} tab lines for Kiss the Rain`)
}

seed()
