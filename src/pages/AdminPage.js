import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MarkdownContent from '../components/MarkdownContent'
import './AdminPage.css'

const EMPTY_SONG = {
  title: '', slug: '', genre: '', difficulty: 'beginner',
  author: '', description: '', youtube_videos: [], is_published: false
}

const EMPTY_ARTICLE = {
  title: '', slug: '', excerpt: '', content: '',
  cover_image_url: '', author: '', tags: [], is_published: false,
}

function slugify(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminPage() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [section, setSection] = useState(
    () => (searchParams.get('section') === 'articles' ? 'articles' : 'songs')
  ) // 'songs' | 'articles'

  // Keep section in sync if the URL param changes (e.g. user re-clicks the dropdown)
  useEffect(() => {
    const next = searchParams.get('section') === 'articles' ? 'articles' : 'songs'
    setSection(next)
  }, [searchParams])
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

  // Auto-open edit mode if ?edit=slug is in the URL
  useEffect(() => {
    const editSlug = searchParams.get('edit')
    if (editSlug && songs.length > 0) {
      const song = songs.find(s => s.slug === editSlug)
      if (song) startEdit(song)
    }
  }, [searchParams, songs])

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
    setTabs(data?.map(t => {
      const hasLyrics = (t.syllables ?? []).some(s => s && String(s).trim())
      const raw = t.notes.map((n, i) => {
        const oct = n.octave === 2 ? '°°' : n.octave ? '°' : ''
        const syl = t.syllables?.[i] ?? ''
        return hasLyrics ? `${n.note}${oct}:${syl}` : `${n.note}${oct}`
      }).join(hasLyrics ? ' | ' : ' ')
      return { ...t, raw }
    }) ?? [])
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

  // Parse a tab-line string. All of these are equivalent:
  //   1° 2° 3°
  //   1* 2* 3*
  //   1*:Three 2*:lit- 3*:tle
  //   1°:Three | 2°:lit- | 3°:tle      (legacy format, still works)
  // Octave markers: * ^ ' or ° (single = high, double = double-high).
  function parseRaw(raw) {
    if (!raw) return { notes: [], syllables: [] }
    const tokens = raw
      .replace(/\|/g, ' ')
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean)
    const notes = []
    const syllables = []
    for (const tok of tokens) {
      const colonIdx = tok.indexOf(':')
      const noteStr = colonIdx >= 0 ? tok.slice(0, colonIdx).trim() : tok.trim()
      const syl = colonIdx >= 0 ? tok.slice(colonIdx + 1).trim() : ''
      const normalizedNote = noteStr.replace(/[\*\^'\u02C7\u02DA\u00B7]/g, '°')
      const octaveMatches = normalizedNote.match(/°/g)
      const octave = octaveMatches ? Math.min(octaveMatches.length, 2) : 0
      const note = normalizedNote.replace(/°/g, '')
      if (!note) continue
      notes.push({ note, octave })
      syllables.push(syl)
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
      author: form.author,
      description: form.description,
      youtube_videos: form.youtube_videos ?? [],
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
          <div className="admin-section-tabs" role="tablist" aria-label="Admin section">
            <button
              type="button"
              role="tab"
              aria-selected={section === 'songs'}
              className={`admin-section-tab${section === 'songs' ? ' admin-section-tab--active' : ''}`}
              onClick={() => setSection('songs')}
            >
              Songs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'articles'}
              className={`admin-section-tab${section === 'articles' ? ' admin-section-tab--active' : ''}`}
              onClick={() => setSection('articles')}
            >
              Articles
            </button>
          </div>
        )}

        {section === 'articles' ? (
          <ArticlesAdminSection />
        ) : (
        <>
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
                    <span className="admin-row-meta">{song.genre} · {song.difficulty}{song.author ? ` · ${song.author}` : ''}</span>
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
                  </div>
                  <Field label="Author / Artist" value={form.author} onChange={v => setForm(f => ({ ...f, author: v }))} />
                  <div className="field-row">
                  </div>
                  <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
                  <div className="field">
                    <label className="field-label">YouTube Videos</label>
                    {(form.youtube_videos ?? []).map((v, i) => (
                      <div key={i} className="video-row">
                        <input className="field-input" placeholder="YouTube URL" value={v.url}
                          onChange={e => setForm(f => { const vids = [...f.youtube_videos]; vids[i] = { ...vids[i], url: e.target.value }; return { ...f, youtube_videos: vids } })} />
                        <input className="field-input" placeholder="Label (optional)" value={v.title ?? ''}
                          onChange={e => setForm(f => { const vids = [...f.youtube_videos]; vids[i] = { ...vids[i], title: e.target.value }; return { ...f, youtube_videos: vids } })} />
                        <button className="icon-btn danger" onClick={() => setForm(f => ({ ...f, youtube_videos: f.youtube_videos.filter((_, idx) => idx !== i) }))}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button className="btn btn-outline add-line-btn" onClick={() => setForm(f => ({ ...f, youtube_videos: [...(f.youtube_videos ?? []), { url: '', title: '' }] }))}>
                      <Plus size={14} /> Add Video
                    </button>
                  </div>
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
                <p className="edit-hint">
                  Just type notes separated by spaces. Use <code>*</code> (or <code>°</code>) for high octave, <code>**</code> for double-high.
                  <br />
                  Notes only: <code>1 2 3* 5*</code> — with lyrics: <code>1:Three 1:lit- 3*:tle 5:kit-</code>
                </p>
                <div className="tab-lines">
                  {tabs.map((t, i) => (
                    <div key={i} className="tab-line-row">
                      <span className="tab-line-num">{i + 1}</span>
                      <textarea
                        className="field-input tab-line-input"
                        value={t.raw}
                        onChange={e => updateTabRaw(i, e.target.value)}
                        placeholder="1 2 3* 5*    or    1:Three 1:lit- 3*:tle"
                        rows={1}
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
        </>
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

// ============================================================
// ARTICLES ADMIN
// ============================================================

function ArticlesAdminSection() {
  const [articles, setArticles] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_ARTICLE)
  const [tagsInput, setTagsInput] = useState('')
  const [view, setView] = useState('list')
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchArticles() }, [])

  async function fetchArticles() {
    const { data } = await supabase
      .from('articles')
      .select('id, title, slug, author, is_published, published_at, created_at, updated_at')
      .order('created_at', { ascending: false })
    setArticles(data ?? [])
  }

  function startNew() {
    setEditing(null)
    setForm(EMPTY_ARTICLE)
    setTagsInput('')
    setPreviewing(false)
    setError('')
    setView('edit')
  }

  async function startEdit(article) {
    setError('')
    const { data, error: fetchErr } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article.id)
      .single()
    if (fetchErr || !data) {
      setError('Could not load article.')
      return
    }
    setEditing(data)
    setForm({
      title: data.title ?? '',
      slug: data.slug ?? '',
      excerpt: data.excerpt ?? '',
      content: data.content ?? '',
      cover_image_url: data.cover_image_url ?? '',
      author: data.author ?? '',
      tags: data.tags ?? [],
      is_published: !!data.is_published,
    })
    setTagsInput((data.tags ?? []).join(', '))
    setPreviewing(false)
    setView('edit')
  }

  async function deleteArticle(id) {
    if (!window.confirm('Delete this article? This cannot be undone.')) return
    await supabase.from('articles').delete().eq('id', id)
    fetchArticles()
  }

  async function togglePublish(article) {
    const next = !article.is_published
    await supabase
      .from('articles')
      .update({
        is_published: next,
        published_at: next && !article.published_at
          ? new Date().toISOString()
          : article.published_at ?? null,
      })
      .eq('id', article.id)
    fetchArticles()
  }

  async function handleSave() {
    setError('')
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const slug = form.slug.trim() || slugify(form.title)
    if (!slug) {
      setError('Could not derive a slug from the title.')
      setSaving(false)
      return
    }

    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt?.trim() || null,
      content: form.content ?? '',
      cover_image_url: form.cover_image_url?.trim() || null,
      author: form.author?.trim() || null,
      tags,
      is_published: !!form.is_published,
      updated_at: new Date().toISOString(),
    }

    if (form.is_published && !editing?.published_at) {
      payload.published_at = new Date().toISOString()
    }

    let result
    if (editing) {
      result = await supabase.from('articles').update(payload).eq('id', editing.id)
    } else {
      result = await supabase.from('articles').insert(payload)
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message || 'Save failed.')
      return
    }

    fetchArticles()
    setView('list')
  }

  if (view === 'list') {
    return (
      <>
        <div className="admin-header">
          <h1 className="admin-title font-title">Articles</h1>
          <button className="btn btn-primary" onClick={startNew}>
            <Plus size={16} /> New Article
          </button>
        </div>

        <div className="admin-table card">
          {articles.length === 0 && (
            <p className="admin-empty">No articles yet. Write your first one.</p>
          )}
          {articles.map(article => (
            <div key={article.id} className="admin-row">
              <div className="admin-row-info">
                <span className="admin-row-title font-title">{article.title}</span>
                <span className="admin-row-meta">
                  /resources/articles/{article.slug}
                  {article.author ? ` · ${article.author}` : ''}
                </span>
              </div>
              <div className="admin-row-actions">
                <button
                  className="icon-btn"
                  onClick={() => togglePublish(article)}
                  title={article.is_published ? 'Unpublish' : 'Publish'}
                >
                  {article.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button className="icon-btn" onClick={() => startEdit(article)} title="Edit">✏️</button>
                <button
                  className="icon-btn danger"
                  onClick={() => deleteArticle(article.id)}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="edit-view">
      <div className="edit-header">
        <button className="btn btn-outline" onClick={() => setView('list')}>← Back</button>
        <h2 className="admin-title font-title">{editing ? 'Edit Article' : 'New Article'}</h2>
      </div>

      <div className="edit-grid">
        <div className="card edit-section">
          <h3 className="edit-section-title">Article Details</h3>
          <div className="edit-fields">
            <Field
              label="Title"
              value={form.title}
              onChange={v => setForm(f => ({ ...f, title: v }))}
            />
            <Field
              label="Slug (auto-generated if empty)"
              value={form.slug}
              onChange={v => setForm(f => ({ ...f, slug: v }))}
            />
            <Field
              label="Author (optional)"
              value={form.author}
              onChange={v => setForm(f => ({ ...f, author: v }))}
            />
            <Field
              label="Cover image URL (optional)"
              value={form.cover_image_url}
              onChange={v => setForm(f => ({ ...f, cover_image_url: v }))}
            />
            <Field
              label="Excerpt (short summary shown on cards)"
              value={form.excerpt}
              onChange={v => setForm(f => ({ ...f, excerpt: v }))}
              multiline
            />
            <div className="field">
              <label className="field-label">Tags (comma separated)</label>
              <input
                className="field-input"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="beginner, technique, history"
              />
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              />
              Published (visible to public)
            </label>
          </div>
        </div>

        <div className="card edit-section">
          <div className="article-content-head">
            <h3 className="edit-section-title">Content (Markdown)</h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPreviewing(p => !p)}
            >
              {previewing ? 'Edit' : 'Preview'}
            </button>
          </div>
          <p className="edit-hint">
            Supports Markdown — headings (<code>#</code>, <code>##</code>),
            <code>**bold**</code>, <code>*italic*</code>, <code>[link](url)</code>,
            lists, <code>&gt; quotes</code>, code blocks, and images.
          </p>

          {previewing ? (
            <div className="article-preview-wrap">
              <MarkdownContent content={form.content} />
              {!form.content && <p className="admin-empty">Nothing to preview yet.</p>}
            </div>
          ) : (
            <textarea
              className="field-input article-content-input"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={'# My article\n\nWrite your article here in Markdown.\n\n## Section\n\n- A list item\n- Another item\n'}
              rows={18}
            />
          )}
        </div>
      </div>

      {error && <p className="article-error">{error}</p>}

      <div className="edit-footer">
        <button className="btn btn-outline" onClick={() => setView('list')}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Article'}
        </button>
      </div>
    </div>
  )
}
