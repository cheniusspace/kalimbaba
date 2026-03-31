import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './AdminPage.css'

const EMPTY_SONG = {
  title: '', slug: '', genre: '', difficulty: 'beginner',
  audience: 'all', description: '', is_published: false
}

export default function AdminPage() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [songs, setSongs] = useState([])
  const [editing, setEditing] = useState(null)   // song being edited
  const [form, setForm] = useState(EMPTY_SONG)
  const [tabs, setTabs] = useState([])             // tab lines for current song
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('list')         // 'list' | 'edit'

  useEffect(() => {
    if (!loading && !profile?.is_admin) navigate('/')
  }, [loading, profile])

  useEffect(() => { fetchSongs() }, [])

  async function fetchSongs() {
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    setSongs(data ?? [])
  }

  function startNew() {
    setEditing(null)
    setForm(EMPTY_SONG)
    setTabs([{ line_order: 1, notes: [], syllables: [], raw: '' }])
    setView('edit')
  }

  async function startEdit(song) {
    setEditing(song)
    setForm({ ...song })
    const { data } = await supabase.from('tabs').select('*').eq('song_id', song.id).order('line_order')
    setTabs(data?.map(t => ({
      ...t,
      raw: t.notes.map((n, i) => `${n.note}${n.octave ? '°' : ''}:${t.syllables[i] ?? ''}`).join(' | ')
    })) ?? [])
    setView('edit')
  }

  async function deleteSong(id) {
    if (!window.confirm('Delete this song and all its tabs?')) return
    await supabase.from('songs').delete().eq('id', id)
    fetchSongs()
  }

  async function togglePublish(song) {
    await supabase.from('songs').update({ is_published: !song.is_published }).eq('id', song.id)
    fetchSongs()
  }

  function addTabLine() {
    setTabs(prev => [...prev, { line_order: prev.length + 1, notes: [], syllables: [], raw: '' }])
  }

  function removeTabLine(i) {
    setTabs(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateTabRaw(i, value) {
    setTabs(prev => prev.map((t, idx) => idx === i ? { ...t, raw: value } : t))
  }

  // Parse raw string like "1°:Three | 1°:lit- | 3°:tle | 5:kit-"
  function parseRaw(raw) {
    const pairs = raw.split('|').map(s => s.trim()).filter(Boolean)
    const notes = [], syllables = []
    for (const pair of pairs) {
      const [noteStr, syl] = pair.split(':')
      const note = noteStr?.trim().replace('°', '')
      const octave = noteStr?.includes('°')
      notes.push({ note: note ?? '', octave: !!octave })
      syllables.push(syl?.trim() ?? '')
    }
    return { notes, syllables }
  }

  async function handleSave() {
    setSaving(true)
    let songId = editing?.id

    const songData = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      genre: form.genre,
      difficulty: form.difficulty,
      audience: form.audience,
      description: form.description,
      is_published: form.is_published,
      updated_at: new Date().toISOString()
    }

    if (editing) {
      await supabase.from('songs').update(songData).eq('id', songId)
    } else {
      const { data } = await supabase.from('songs').insert(songData).select().single()
      songId = data.id
    }

    // Delete existing tabs and re-insert
    await supabase.from('tabs').delete().eq('song_id', songId)
    const tabInserts = tabs.map((t, i) => {
      const { notes, syllables } = parseRaw(t.raw)
      return { song_id: songId, line_order: i + 1, notes, syllables }
    })
    await supabase.from('tabs').insert(tabInserts)

    setSaving(false)
    fetchSongs()
    setView('list')
  }

  if (loading) return null

  return (
    <div className="admin-page">
      <div className="container">

        {view === 'list' && (
          <>
            <div className="admin-header">
              <h1 className="admin-title font-title">Admin Panel</h1>
              <button className="btn btn-primary" onClick={startNew}>
                <Plus size={16} /> New Song
              </button>
            </div>

            <div className="admin-table card">
              {songs.length === 0 && <p className="admin-empty">No songs yet. Add your first one!</p>}
              {songs.map(song => (
                <div key={song.id} className="admin-row">
                  <div className="admin-row-info">
                    <span className="admin-row-title font-title">{song.title}</span>
                    <span className="admin-row-meta">{song.genre} · {song.difficulty} · {song.audience}</span>
                  </div>
                  <div className="admin-row-actions">
                    <button className="icon-btn" onClick={() => togglePublish(song)} title={song.is_published ? 'Unpublish' : 'Publish'}>
                      {song.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button className="icon-btn" onClick={() => startEdit(song)} title="Edit">✏️</button>
                    <button className="icon-btn danger" onClick={() => deleteSong(song.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'edit' && (
          <div className="edit-view">
            <div className="edit-header">
              <button className="btn btn-outline" onClick={() => setView('list')}>← Back</button>
              <h2 className="admin-title font-title">{editing ? 'Edit Song' : 'New Song'}</h2>
            </div>

            <div className="edit-grid">
              {/* Song fields */}
              <div className="card edit-section">
                <h3 className="edit-section-title">Song Details</h3>
                <div className="edit-fields">
                  <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
                  <Field label="Slug (auto-generated if empty)" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} />
                  <div className="field-row">
                    <SelectField label="Genre" value={form.genre} onChange={v => setForm(f => ({ ...f, genre: v }))}
                      options={['', 'children', 'pop', 'classical', 'folk', 'anime', 'other']} />
                    <SelectField label="Difficulty" value={form.difficulty} onChange={v => setForm(f => ({ ...f, difficulty: v }))}
                      options={['beginner', 'intermediate', 'advanced']} />
                    <SelectField label="Audience" value={form.audience} onChange={v => setForm(f => ({ ...f, audience: v }))}
                      options={['all', 'children', 'adult']} />
                  </div>
                  <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.is_published}
                      onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
                    Published (visible to public)
                  </label>
                </div>
              </div>

              {/* Tabs */}
              <div className="card edit-section">
                <h3 className="edit-section-title">Tab Lines</h3>
                <p className="edit-hint">Format each line as: <code>1°:Three | 1°:lit- | 3°:tle | 5:kit-</code></p>
                <div className="tab-lines">
                  {tabs.map((t, i) => (
                    <div key={i} className="tab-line-row">
                      <span className="tab-line-num">{i + 1}</span>
                      <input
                        className="field-input tab-line-input"
                        value={t.raw}
                        onChange={e => updateTabRaw(i, e.target.value)}
                        placeholder="1°:Three | 1°:lit- | 3°:tle | 5:kit-"
                      />
                      <button className="icon-btn danger" onClick={() => removeTabLine(i)}><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button className="btn btn-outline add-line-btn" onClick={addTabLine}>
                    <Plus size={14} /> Add Line
                  </button>
                </div>
              </div>
            </div>

            <div className="edit-footer">
              <button className="btn btn-outline" onClick={() => setView('list')}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Song'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, multiline }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {multiline
        ? <textarea className="field-input" rows={3} value={value} onChange={e => onChange(e.target.value)} />
        : <input className="field-input" type="text" value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select className="field-input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </div>
  )
}
