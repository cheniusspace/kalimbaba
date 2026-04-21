import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Eye, EyeOff, ClipboardPaste, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MarkdownContent from '../components/MarkdownContent'
import './AdminPage.css'
import './SongPage.css'

const EMPTY_SONG = {
  title: '', slug: '', genre: '',
  author: '', description: '', youtube_videos: [], is_published: false
}

const DIFFICULTY_OPTIONS = ['beginner', 'intermediate', 'advanced']

const SAMPLE_IMPORT = `\`\`\`meta
title:       Twinkle Twinkle Little Star
author:      Traditional
genre:       children
description: Classic children's lullaby, simple single-octave arrangement.
youtube:
\`\`\`

\`\`\`version
name:        Original
difficulty:  beginner
description:
\`\`\`

\`\`\`tabs
1:Twin-\t1:kle\t5:lit-\t5:tle\t6:star\t6:how\t5:I
4:won-\t4:der\t3:what\t3:you\t2:are\t2:\t1:
\`\`\``

function emptyCell() { return { note: '', syllable: '' } }

function newVersion(overrides = {}) {
  return {
    id: null,
    name: 'Original',
    difficulty: 'beginner',
    description: '',
    is_default: true,
    sort_order: 0,
    tabs: [{ line_order: 1, cells: [emptyCell()] }],
    ...overrides,
  }
}

// Parse a tab-line string. All of these are equivalent:
//   1° 2° 3°
//   1* 2* 3*
//   1*:Three 2*:lit- 3*:tle
//   1°:Three | 2°:lit- | 3°:tle      (legacy format, still works)
//   1, 2, 3*                          (commas also work)
// Octave markers: * ^ ' or ° (single = high, double = double-high).
function parseRaw(raw) {
  if (!raw) return { notes: [], syllables: [] }
  const tokens = raw
    .replace(/[|,]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean)
  const notes = []
  const syllables = []
  for (const tok of tokens) {
    const colonIdx = tok.indexOf(':')
    const noteStr = colonIdx >= 0 ? tok.slice(0, colonIdx).trim() : tok.trim()
    const syl = colonIdx >= 0 ? tok.slice(colonIdx + 1).trim() : ''
    const parsed = parseNoteToken(noteStr)
    if (!parsed.note) continue
    notes.push(parsed)
    syllables.push(syl)
  }
  return { notes, syllables }
}

// Turn a single note token like "1", "3*", "5°°" into { note, octave }.
function parseNoteToken(raw) {
  if (!raw) return { note: '', octave: 0 }
  const normalized = String(raw).replace(/[\*\^'\u02C7\u02DA\u00B7]/g, '°')
  const octave = Math.min((normalized.match(/°/g) || []).length, 2)
  return { note: normalized.replace(/°/g, '').trim(), octave }
}

// Render a cell's note back to its display form ("1", "3°", "5°°").
function noteDisplay(n) {
  const oct = n.octave === 2 ? '°°' : n.octave === 1 ? '°' : ''
  return `${n.note}${oct}`
}

// Convert a raw tab string into an array of cells for the editor.
function cellsFromRaw(raw) {
  const { notes, syllables } = parseRaw(raw)
  if (notes.length === 0) return [emptyCell()]
  return notes.map((n, i) => ({
    note: noteDisplay(n),
    syllable: syllables[i] ?? '',
  }))
}

function tabRowFromDb(row) {
  const cells = (row.notes ?? []).map((n, i) => ({
    note: noteDisplay(n),
    syllable: row.syllables?.[i] ?? '',
  }))
  return {
    id: row.id,
    line_order: row.line_order,
    cells: cells.length ? cells : [emptyCell()],
  }
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

// ─── Structured import parser ──────────────────────────────────────────────
// Parses text like:
//   ```meta
//   title: ...
//   author: ...
//   ```
//   ```version
//   name: Easy
//   difficulty: beginner
//   ```
//   ```tabs
//   1:Twin-  1:kle  5:lit-  5:tle
//   ...
//   ```
// Multiple version+tabs pairs are paired in order. Returns:
//   { meta: {title,author,...}, versions: [{name,difficulty,description,lines:[]}] }
function parseKvBlock(body) {
  const out = {}
  let currentKey = null
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim()) { currentKey = null; continue }
    // Allow optional bullet/list markers ("- ", "* ", "• ") in front of keys.
    const m = line.match(/^\s*[-*•]?\s*([a-zA-Z_][\w-]*)\s*[:=]\s*(.*)$/)
    if (m) {
      currentKey = m[1].toLowerCase()
      out[currentKey] = m[2].trim()
    } else if (currentKey) {
      out[currentKey] = (out[currentKey] ? out[currentKey] + ' ' : '') + line.trim()
    }
  }
  return out
}

// Map any keyword the AI might use into one of our 3 canonical kinds.
function keywordToKind(word) {
  const w = word.toLowerCase().replace(/[\s_-]+/g, '')
  if (['meta', 'metadata', 'info', 'information', 'details', 'songinfo', 'songdetails', 'songmeta', 'song'].includes(w)) return 'meta'
  if (w === 'version' || w === 'arrangement' || /^version\d+$/.test(w)) return 'version'
  if (['tab', 'tabs', 'tabline', 'tablines', 'lines', 'notes', 'sheet'].includes(w)) return 'tabs'
  return null
}

// Find all section markers in the pasted text. Tolerates many forms:
//   ```meta              # plain fenced block
//   ``` meta             # fence with space
//   meta                 # bare word on its own line
//   META:                # uppercase with colon
//   ## Meta              # markdown header
//   **Meta**             # bold
//   1. Meta              # numbered list
//   - Tabs               # bullet
//   Tab Lines:           # synonym + colon
//   Version 1            # version + number
function findSectionsByHeader(text) {
  // Capture an optional decoration prefix, then a keyword phrase, then optional decoration suffix.
  // Keyword phrase = up to two words like "tab lines" or "song info" or "version 1".
  const markerRe =
    /^[ \t]*(?:`{3,}[ \t]*|`+[ \t]*|#+[ \t]*|\*+[ \t]*|>[ \t]*|[-*•][ \t]+|\d+[.)][ \t]+)*([A-Za-z]+(?:[ _-][A-Za-z0-9]+)?)[ \t]*(?:[`*#:.\-—]+[ \t]*)*$/gim
  const markers = []
  let m
  while ((m = markerRe.exec(text)) !== null) {
    const kind = keywordToKind(m[1])
    if (!kind) continue
    markers.push({
      kind,
      lineStart: m.index,
      lineEnd: m.index + m[0].length,
    })
  }
  return markers.map((mk, i) => {
    const next = markers[i + 1]
    let body = text.slice(mk.lineEnd, next ? next.lineStart : text.length)
    body = body
      .split(/\r?\n/)
      .filter(l => !/^[ \t]*`{3,}[ \t]*$/.test(l)) // strip stray ``` lines
      .join('\n')
      .replace(/^\s+|\s+$/g, '')
    return { kind: mk.kind, body }
  })
}

// Heuristic last-resort parse: split into a header (key:value pairs) section
// and a tab-lines section. Useful when the user pastes plain text with no
// section markers at all, e.g.:
//   Title: A Thousand Years
//   Author: Christina Perri
//
//   3* 3* 3* 2*
//   4* 4* 4* 1*
function parseHeaderlessImport(text) {
  const lines = text.split(/\r?\n/)
  const kvLines = []
  const tabLines = []
  let inHeader = true

  // A "key: value" pattern that is NOT a tab-line note (i.e. key isn't a digit).
  const kvRe = /^\s*([A-Za-z][\w \-]{0,30})\s*[:=]\s+\S/

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      if (inHeader && kvLines.length > 0) inHeader = false
      continue
    }
    if (inHeader && kvRe.test(line)) {
      kvLines.push(line)
      continue
    }
    inHeader = false
    tabLines.push(line)
  }

  if (kvLines.length === 0 && tabLines.length === 0) return null
  const meta = parseKvBlock(kvLines.join('\n'))
  const versions = tabLines.length ? [{ name: 'Original', lines: tabLines }] : []
  return { meta, versions }
}

function parseStructuredImport(text) {
  if (!text || !text.trim()) {
    throw new Error('Paste the AI output first.')
  }

  // 1) Try strict fenced-block match (```meta ... ```).
  const blocks = []
  const strictRe = /```[ \t]*(meta|version|tabs)\b[^\n]*\n([\s\S]*?)```/gi
  let m
  while ((m = strictRe.exec(text)) !== null) {
    blocks.push({ kind: m[1].toLowerCase(), body: m[2].replace(/\s+$/, '') })
  }

  // 2) Fallback: header-style markers (handles when chat UI stripped backticks).
  let allBlocks = blocks
  if (allBlocks.length === 0) {
    allBlocks = findSectionsByHeader(text)
  }

  // 3) Last-resort: no section markers at all — try header-less heuristic.
  if (allBlocks.length === 0) {
    const headerless = parseHeaderlessImport(text)
    if (headerless && (headerless.versions.length > 0 || Object.keys(headerless.meta).length > 0)) {
      return headerless
    }
    const preview = text.replace(/\s+/g, ' ').slice(0, 120)
    throw new Error(
      `Could not find any sections. Add a "meta", "version", or "tabs" header line, or paste plain "key: value" lines followed by tab lines. Got: "${preview}…"`
    )
  }

  const meta = {}
  const versions = []
  let pendingVersion = null

  for (const b of allBlocks) {
    if (b.kind === 'meta') {
      Object.assign(meta, parseKvBlock(b.body))
    } else if (b.kind === 'version') {
      if (pendingVersion) versions.push({ ...pendingVersion, lines: [] })
      pendingVersion = parseKvBlock(b.body)
    } else if (b.kind === 'tabs') {
      const lines = b.body
        .split(/\r?\n/)
        .map(l => l.replace(/\s+$/, ''))
        .filter(l => l.trim().length > 0)
      const v = pendingVersion || {}
      versions.push({ ...v, lines })
      pendingVersion = null
    }
  }
  if (pendingVersion) versions.push({ ...pendingVersion, lines: [] })

  if (versions.length === 0 && Object.keys(meta).length === 0) {
    throw new Error('Found section headers but no usable content. Each block needs key: value lines or tab lines.')
  }
  return { meta, versions }
}

// Map AI / source genre strings to the values our SelectField actually accepts.
function normalizeGenre(g) {
  if (!g) return ''
  const v = g.toLowerCase().trim()
  const allowed = ['children', 'pop', 'classical', 'folk', 'anime', 'other']
  if (allowed.includes(v)) return v
  if (v === 'kids' || v === 'kid' || v === "children's") return 'children'
  if (v === 'traditional') return 'folk'
  return 'other'
}

function normalizeDifficulty(d) {
  const v = (d || '').toLowerCase().trim()
  if (v === 'beginner' || v === 'easy') return 'beginner'
  if (v === 'intermediate' || v === 'medium') return 'intermediate'
  if (v === 'advanced' || v === 'hard' || v === 'expert') return 'advanced'
  return 'beginner'
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
  const [versions, setVersions] = useState([])     // [{ id, name, difficulty, description, is_default, sort_order, tabs: [{id?, line_order, raw}] }]
  const [removedVersionIds, setRemovedVersionIds] = useState([])
  const [activeVersionIdx, setActiveVersionIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('list')         // 'list' | 'edit'
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

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
    setVersions([newVersion()])
    setRemovedVersionIds([])
    setActiveVersionIdx(0)
    setView('edit')
  }

  async function startEdit(song) {
    setEditing(song)
    setForm({ ...song })
    setRemovedVersionIds([])

    const { data: versionRows } = await supabase
      .from('song_versions')
      .select('*')
      .eq('song_id', song.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const versionList = versionRows ?? []

    if (versionList.length === 0) {
      // Legacy song with no versions yet — create a placeholder
      setVersions([newVersion()])
      setActiveVersionIdx(0)
      setView('edit')
      return
    }

    const versionIds = versionList.map(v => v.id)
    const { data: tabRows } = await supabase
      .from('tabs')
      .select('*')
      .in('song_version_id', versionIds)
      .order('line_order', { ascending: true })

    const tabsByVersion = new Map()
    for (const t of tabRows ?? []) {
      const arr = tabsByVersion.get(t.song_version_id) ?? []
      arr.push(tabRowFromDb(t))
      tabsByVersion.set(t.song_version_id, arr)
    }

    const built = versionList.map(v => ({
      id: v.id,
      name: v.name ?? 'Original',
      difficulty: v.difficulty ?? 'beginner',
      description: v.description ?? '',
      is_default: !!v.is_default,
      sort_order: v.sort_order ?? 0,
      tabs: tabsByVersion.get(v.id) ?? [{ line_order: 1, cells: [emptyCell()] }],
    }))

    if (!built.some(v => v.is_default)) built[0].is_default = true

    setVersions(built)
    setActiveVersionIdx(0)
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

  function patchVersion(idx, patch) {
    setVersions(prev => prev.map((v, i) => i === idx ? { ...v, ...patch } : v))
  }

  function addVersion() {
    setVersions(prev => {
      const next = [...prev, newVersion({
        name: `Version ${prev.length + 1}`,
        is_default: prev.length === 0,
        sort_order: prev.length,
      })]
      setActiveVersionIdx(next.length - 1)
      return next
    })
  }

  function removeVersion(idx) {
    if (versions.length <= 1) return
    if (!window.confirm(`Remove "${versions[idx].name}" and its tab lines?`)) return
    setVersions(prev => {
      const removed = prev[idx]
      if (removed?.id) setRemovedVersionIds(ids => [...ids, removed.id])
      const next = prev.filter((_, i) => i !== idx)
      if (!next.some(v => v.is_default)) next[0].is_default = true
      return next
    })
    setActiveVersionIdx(i => Math.max(0, Math.min(i, versions.length - 2)))
  }

  function setDefaultVersion(idx) {
    setVersions(prev => prev.map((v, i) => ({ ...v, is_default: i === idx })))
  }

  function addTabLine(versionIdx) {
    setVersions(prev => prev.map((v, i) => {
      if (i !== versionIdx) return v
      return { ...v, tabs: [...v.tabs, { line_order: v.tabs.length + 1, cells: [emptyCell()] }] }
    }))
  }

  function removeTabLine(versionIdx, lineIdx) {
    setVersions(prev => prev.map((v, i) => {
      if (i !== versionIdx) return v
      const nextTabs = v.tabs.filter((_, j) => j !== lineIdx)
      return { ...v, tabs: nextTabs.length ? nextTabs : [{ line_order: 1, cells: [emptyCell()] }] }
    }))
  }

  function updateCell(versionIdx, lineIdx, cellIdx, field, value) {
    setVersions(prev => prev.map((v, i) => {
      if (i !== versionIdx) return v
      return {
        ...v,
        tabs: v.tabs.map((t, j) => {
          if (j !== lineIdx) return t
          return {
            ...t,
            cells: t.cells.map((c, k) => k === cellIdx ? { ...c, [field]: value } : c),
          }
        }),
      }
    }))
  }

  function mutateCells(versionIdx, lineIdx, mutator) {
    setVersions(prev => prev.map((v, i) => {
      if (i !== versionIdx) return v
      return {
        ...v,
        tabs: v.tabs.map((t, j) => {
          if (j !== lineIdx) return t
          const next = mutator(t.cells)
          return { ...t, cells: next.length ? next : [emptyCell()] }
        }),
      }
    }))
  }

  function addCell(versionIdx, lineIdx, atIdx) {
    mutateCells(versionIdx, lineIdx, cells => {
      const insertAt = typeof atIdx === 'number' ? atIdx : cells.length
      const next = [...cells]
      next.splice(insertAt, 0, emptyCell())
      return next
    })
  }

  function removeCell(versionIdx, lineIdx, cellIdx) {
    mutateCells(versionIdx, lineIdx, cells => cells.filter((_, k) => k !== cellIdx))
  }

  function focusCell(versionIdx, lineIdx, cellIdx, field) {
    requestAnimationFrame(() => {
      const sel = `[data-cell="v${versionIdx}-l${lineIdx}-c${cellIdx}-${field}"]`
      const el = document.querySelector(sel)
      if (el) {
        el.focus()
        if (typeof el.select === 'function') el.select()
      }
    })
  }

  // Keyboard handling inside a note/syllable cell input.
  //   Tab           → next cell (same field). Adds a new cell if on the last one.
  //   Shift+Tab     → previous cell (same field). Falls through at the start.
  //   Enter on note → focus this cell's syllable.
  //   Enter on syl  → focus next cell's note (adds a new cell if on the last one).
  //   Backspace on an empty cell → remove cell, focus previous note.
  function handleCellKey(versionIdx, lineIdx, cellIdx, field, e) {
    const line = versions[versionIdx]?.tabs[lineIdx]
    if (!line) return
    const cells = line.cells
    const isLast = cellIdx === cells.length - 1

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (cellIdx === 0) return // let browser move focus out
        e.preventDefault()
        focusCell(versionIdx, lineIdx, cellIdx - 1, field)
        return
      }
      e.preventDefault()
      if (isLast) {
        addCell(versionIdx, lineIdx)
        focusCell(versionIdx, lineIdx, cellIdx + 1, field)
      } else {
        focusCell(versionIdx, lineIdx, cellIdx + 1, field)
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'note') {
        focusCell(versionIdx, lineIdx, cellIdx, 'syl')
      } else {
        if (isLast) addCell(versionIdx, lineIdx)
        focusCell(versionIdx, lineIdx, cellIdx + 1, 'note')
      }
      return
    }

    if (e.key === 'Backspace') {
      const cell = cells[cellIdx]
      const isEmpty = !cell.note && !cell.syllable
      if (isEmpty && cells.length > 1) {
        e.preventDefault()
        removeCell(versionIdx, lineIdx, cellIdx)
        const target = Math.max(0, cellIdx - 1)
        focusCell(versionIdx, lineIdx, target, 'note')
      }
      return
    }
  }

  // If the user pastes multiple tokens into a note cell (e.g. "1 3 5" or "1,3,5"),
  // split them into consecutive cells instead of dumping the string into one.
  function handleCellPaste(versionIdx, lineIdx, cellIdx, e) {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text || !/[\s,|]/.test(text)) return
    e.preventDefault()
    const { notes, syllables } = parseRaw(text)
    if (notes.length === 0) return
    mutateCells(versionIdx, lineIdx, cells => {
      const next = [...cells]
      const pasted = notes.map((n, i) => ({
        note: noteDisplay(n),
        syllable: syllables[i] ?? '',
      }))
      next.splice(cellIdx, 1, ...pasted)
      return next
    })
    focusCell(versionIdx, lineIdx, cellIdx + notes.length - 1, 'note')
  }

  // Open the structured-paste panel. If we're on the song list, jump into
  // a fresh edit view first so the import can populate it directly.
  function openImport() {
    if (view !== 'edit') startNew()
    setImportText('')
    setImportError('')
    setImportOpen(true)
  }

  // Take the parsed { meta, versions } and overwrite the current edit form.
  // For an existing song this also marks the existing versions for deletion
  // on save, so the imported versions cleanly replace them.
  function applyImport() {
    let parsed
    try {
      parsed = parseStructuredImport(importText)
    } catch (e) {
      setImportError(e.message || 'Could not parse import.')
      return
    }

    setForm(f => {
      const next = { ...f }
      if (parsed.meta.title) next.title = parsed.meta.title
      if (parsed.meta.author) next.author = parsed.meta.author
      if (parsed.meta.genre) next.genre = normalizeGenre(parsed.meta.genre)
      if (parsed.meta.description) next.description = parsed.meta.description
      if (parsed.meta.youtube) {
        next.youtube_videos = [{ url: parsed.meta.youtube, title: '' }]
      }
      if (!next.slug && next.title) next.slug = slugify(next.title)
      return next
    })

    if (parsed.versions.length > 0) {
      const built = parsed.versions.map((v, i) => ({
        id: null,
        name: (v.name || '').trim() || (i === 0 ? 'Original' : `Version ${i + 1}`),
        difficulty: normalizeDifficulty(v.difficulty),
        description: (v.description || '').trim(),
        is_default: i === 0,
        sort_order: i,
        tabs: v.lines.length
          ? v.lines.map((raw, j) => ({ line_order: j + 1, cells: cellsFromRaw(raw) }))
          : [{ line_order: 1, cells: [emptyCell()] }],
      }))

      // If editing an existing song, queue the old versions for deletion.
      if (editing) {
        setRemovedVersionIds(prev => [
          ...prev,
          ...versions.map(v => v.id).filter(Boolean),
        ])
      }
      setVersions(built)
      setActiveVersionIdx(0)
    }

    setImportOpen(false)
    setImportText('')
    setImportError('')
  }

  async function handleSave() {
    setSaving(true)
    let songId = editing?.id

    const songData = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      genre: form.genre,
      author: form.author,
      description: form.description,
      youtube_videos: form.youtube_videos ?? [],
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      await supabase.from('songs').update(songData).eq('id', songId)
    } else {
      const { data } = await supabase.from('songs').insert(songData).select().single()
      songId = data.id
    }

    // Remove versions the user deleted from the UI
    if (removedVersionIds.length) {
      await supabase.from('song_versions').delete().in('id', removedVersionIds)
    }

    // Ensure exactly one default
    const versionsToSave = versions.map((v, i) => ({ ...v, sort_order: i }))
    const defaultIdx = Math.max(0, versionsToSave.findIndex(v => v.is_default))
    versionsToSave.forEach((v, i) => { v.is_default = i === defaultIdx })

    for (const v of versionsToSave) {
      const versionPayload = {
        song_id: songId,
        name: v.name?.trim() || 'Original',
        difficulty: v.difficulty || 'beginner',
        description: v.description?.trim() || null,
        is_default: v.is_default,
        sort_order: v.sort_order,
        updated_at: new Date().toISOString(),
      }

      let versionId = v.id
      if (versionId) {
        await supabase.from('song_versions').update(versionPayload).eq('id', versionId)
      } else {
        const { data: inserted } = await supabase
          .from('song_versions')
          .insert(versionPayload)
          .select()
          .single()
        versionId = inserted?.id
      }
      if (!versionId) continue

      await supabase.from('tabs').delete().eq('song_version_id', versionId)
      const tabInserts = v.tabs
        .map((t, i) => {
          const notes = []
          const syllables = []
          for (const c of t.cells ?? []) {
            const parsed = parseNoteToken(c.note)
            if (!parsed.note) continue
            notes.push(parsed)
            syllables.push(c.syllable ?? '')
          }
          if (notes.length === 0) return null
          return { song_version_id: versionId, line_order: i + 1, notes, syllables }
        })
        .filter(Boolean)
      if (tabInserts.length) {
        await supabase.from('tabs').insert(tabInserts)
      }
    }

    setRemovedVersionIds([])
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
              <div className="admin-header-actions">
                <button className="btn btn-outline" onClick={openImport} title="Paste a song formatted by the AI prompt">
                  <ClipboardPaste size={16} /> Paste from prompt
                </button>
                <button className="btn btn-primary" onClick={startNew}>
                  <Plus size={16} /> New Song
                </button>
              </div>
            </div>

            <div className="admin-table card">
              {songs.length === 0 && <p className="admin-empty">No songs yet. Add your first one!</p>}
              {songs.map(song => (
                <div key={song.id} className="admin-row">
                  <div className="admin-row-info">
                    <span className="admin-row-title font-title">{song.title}</span>
                    <span className="admin-row-meta">
                      {song.genre || 'no genre'}{song.author ? ` · ${song.author}` : ''}
                    </span>
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
              <button
                type="button"
                className="btn btn-outline edit-header-action"
                onClick={() => { setImportText(''); setImportError(''); setImportOpen(true) }}
                title="Paste a song formatted by the AI prompt"
              >
                <ClipboardPaste size={16} /> Paste from prompt
              </button>
            </div>

            {importOpen && (
              <div className="card edit-section import-panel">
                <div className="import-panel-head">
                  <h3 className="edit-section-title">Paste structured tab</h3>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setImportOpen(false)}
                    title="Close"
                    aria-label="Close import panel"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="edit-hint">
                  Paste the AI output (the <code>```meta</code>, <code>```version</code>, and <code>```tabs</code> blocks).
                  Fields and tab lines will be filled in automatically. Existing versions on this song will be replaced.
                </p>
                <textarea
                  className="field-input import-textarea"
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={'```meta\ntitle:       Twinkle Twinkle Little Star\nauthor:      Traditional\ngenre:       children\ndescription: Classic lullaby.\nyoutube:\n```\n\n```version\nname:        Original\ndifficulty:  beginner\ndescription:\n```\n\n```tabs\n1:Twin-\t1:kle\t5:lit-\t5:tle\t6:star\n4:won-\t4:der\t3:what\t3:you\t2:are\n```'}
                  rows={12}
                  spellCheck={false}
                />
                {importError && <div className="import-error">{importError}</div>}
                <div className="import-actions">
                  <button
                    type="button"
                    className="btn btn-outline import-sample-btn"
                    onClick={() => { setImportError(''); setImportText(SAMPLE_IMPORT) }}
                    title="Fill the box with a working example so you can test"
                  >
                    Insert sample
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setImportOpen(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={applyImport}>Apply to form</button>
                </div>
              </div>
            )}

            <div className="edit-grid">
              <div className="edit-col">
                {/* Song fields */}
                <div className="card edit-section">
                  <h3 className="edit-section-title">Song Details</h3>
                  <div className="edit-fields">
                    <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
                    <Field label="Slug (auto-generated if empty)" value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} />
                    <SelectField label="Genre" value={form.genre} onChange={v => setForm(f => ({ ...f, genre: v }))}
                      options={['', 'children', 'pop', 'classical', 'folk', 'anime', 'other']} />
                    <Field label="Author / Artist" value={form.author} onChange={v => setForm(f => ({ ...f, author: v }))} />
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

                {/* Versions metadata (below Song Details, still on the left) */}
                <div className="card edit-section">
                  <div className="version-section-head">
                    <h3 className="edit-section-title">Versions</h3>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addVersion}>
                      <Plus size={14} /> Add Version
                    </button>
                  </div>
                  <p className="edit-hint">
                    Add multiple versions of this song (e.g. <em>Easy</em>, <em>Hard</em>, <em>With chords</em>).
                    Pick which one is shown by default to readers.
                  </p>

                  {versions.length > 1 && (
                    <div className="version-tabs" role="tablist" aria-label="Song versions">
                      {versions.map((v, i) => (
                        <button
                          key={v.id ?? `new-${i}`}
                          type="button"
                          role="tab"
                          aria-selected={i === activeVersionIdx}
                          className={`version-tab${i === activeVersionIdx ? ' version-tab--active' : ''}`}
                          onClick={() => setActiveVersionIdx(i)}
                        >
                          {v.name || 'Untitled'}
                          {v.is_default ? <span className="version-tab-default" aria-label="Default"> ★</span> : null}
                        </button>
                      ))}
                    </div>
                  )}

                  {versions[activeVersionIdx] && (() => {
                    const v = versions[activeVersionIdx]
                    const i = activeVersionIdx
                    return (
                      <div className="version-pane">
                        <div className="field-row">
                          <Field
                            label="Version name"
                            value={v.name}
                            onChange={val => patchVersion(i, { name: val })}
                          />
                          <SelectField
                            label="Difficulty"
                            value={v.difficulty}
                            onChange={val => patchVersion(i, { difficulty: val })}
                            options={DIFFICULTY_OPTIONS}
                          />
                        </div>
                        <Field
                          label="Version notes (optional)"
                          value={v.description}
                          onChange={val => patchVersion(i, { description: val })}
                          multiline
                        />
                        <div className="version-meta-row">
                          <label className="checkbox-label">
                            <input
                              type="radio"
                              name="default-version"
                              checked={!!v.is_default}
                              onChange={() => setDefaultVersion(i)}
                            />
                            Default version (shown first to readers)
                          </label>
                          {versions.length > 1 && (
                            <button
                              type="button"
                              className="icon-btn danger version-remove"
                              onClick={() => removeVersion(i)}
                              title="Remove this version"
                            >
                              <Trash2 size={14} /> Remove version
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Tab Lines (right column, spans the full height of the left stack) */}
              {versions[activeVersionIdx] && (() => {
                const v = versions[activeVersionIdx]
                const i = activeVersionIdx
                return (
                  <div className="card edit-section tab-lines-card">
                    <div className="version-section-head">
                      <h3 className="edit-section-title">
                        Tab Lines
                        {versions.length > 1 && v.name && (
                          <span className="tab-lines-version"> — {v.name}</span>
                        )}
                      </h3>
                    </div>
                    <p className="edit-hint">
                      Each note is its own cell. Press <kbd>Tab</kbd> to move to the next note, <kbd>Enter</kbd> to jump to the lyric below, <kbd>Backspace</kbd> on an empty cell to delete it. Use <code>*</code> (or <code>°</code>) for high octave, <code>**</code> for double-high. Pasting a space/comma/tab-separated list splits into cells automatically.
                    </p>
                    <div className="tab-lines">
                      {v.tabs.map((t, j) => (
                        <div key={j} className="tab-line-row">
                          <span className="tab-line-num">{j + 1}</span>
                          <div className="tab-cells">
                            {t.cells.map((c, k) => (
                              <div key={k} className="tab-cell">
                                <input
                                  type="text"
                                  className="tab-cell-note"
                                  data-cell={`v${i}-l${j}-c${k}-note`}
                                  value={c.note}
                                  onChange={e => updateCell(i, j, k, 'note', e.target.value)}
                                  onKeyDown={e => handleCellKey(i, j, k, 'note', e)}
                                  onPaste={e => handleCellPaste(i, j, k, e)}
                                  placeholder="1"
                                  spellCheck={false}
                                  autoComplete="off"
                                />
                                <input
                                  type="text"
                                  className="tab-cell-syl"
                                  data-cell={`v${i}-l${j}-c${k}-syl`}
                                  value={c.syllable}
                                  onChange={e => updateCell(i, j, k, 'syllable', e.target.value)}
                                  onKeyDown={e => handleCellKey(i, j, k, 'syl', e)}
                                  placeholder="lyric"
                                  spellCheck={false}
                                  autoComplete="off"
                                />
                                {t.cells.length > 1 && (
                                  <button
                                    type="button"
                                    className="tab-cell-remove"
                                    onClick={() => removeCell(i, j, k)}
                                    aria-label="Remove note"
                                    title="Remove note"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              className="tab-cell-add"
                              onClick={() => addCell(i, j)}
                              title="Add note"
                            >
                              <Plus size={12} /> note
                            </button>
                          </div>
                          <button
                            type="button"
                            className="icon-btn danger tab-line-remove"
                            onClick={() => removeTabLine(i, j)}
                            aria-label="Remove line"
                            title="Remove line"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button className="btn btn-outline add-line-btn" onClick={() => addTabLine(i)}>
                        <Plus size={14} /> Add Line
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {versions[activeVersionIdx] && (
              <VersionPreview
                song={form}
                version={versions[activeVersionIdx]}
              />
            )}

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

// Live preview of one version, mimicking how readers see the song page.
// Reuses .tab-row / .pairs / .pair / .note / .syl classes from SongPage.css
// so the rendering matches the public page exactly.
function VersionPreview({ song, version }) {
  const renderedTabs = version.tabs
    .map((t, i) => {
      const notes = []
      const syllables = []
      for (const c of t.cells ?? []) {
        const parsed = parseNoteToken(c.note)
        if (!parsed.note) continue
        notes.push(parsed)
        syllables.push(c.syllable ?? '')
      }
      return { id: i, line_order: i + 1, notes, syllables }
    })
    .filter(t => t.notes.length > 0)

  const totalNotes = renderedTabs.reduce((sum, t) => sum + t.notes.length, 0)
  const showVersionHeader = (version.name && version.name !== 'Original') || !!version.description

  return (
    <div className="card edit-section preview-section">
      <div className="preview-section-head">
        <h3 className="edit-section-title">Live preview</h3>
        <span className="preview-meta">
          {renderedTabs.length} line{renderedTabs.length === 1 ? '' : 's'} · {totalNotes} note{totalNotes === 1 ? '' : 's'}
        </span>
      </div>

      <div className="preview-stage">
        <header className="preview-header">
          <h2 className="preview-title font-title">{song.title || 'Untitled song'}</h2>
          {song.author && <p className="preview-author">by {song.author}</p>}
          {song.description && <p className="preview-desc">{song.description}</p>}
          {showVersionHeader && (
            <p className="preview-version-line">
              <span className="preview-version-name">{version.name || 'Original'}</span>
              <span className="preview-version-diff"> · {version.difficulty}</span>
              {version.description && <span className="preview-version-desc"> — {version.description}</span>}
            </p>
          )}
        </header>

        {renderedTabs.length === 0 ? (
          <p className="preview-empty">Add some tab lines to see them rendered here.</p>
        ) : (
          <div className="preview-tab-card">
            {renderedTabs.map((tab, i) => {
              const shade = i % 2 === 0 ? 'shaded' : ''
              const hasLyrics = tab.syllables.some(s => s)
              return (
                <div key={tab.id} className={`tab-row ${shade}`}>
                  <div className="pairs">
                    {tab.notes.map((n, j) => (
                      <div key={j} className="pair">
                        <span className="note">
                          {n.note}
                          {n.octave === 2 ? <sup>°°</sup> : n.octave === 1 ? <sup>°</sup> : null}
                        </span>
                        {hasLyrics && <span className="syl">{tab.syllables[j] || '\u00A0'}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
