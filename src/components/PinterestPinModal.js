import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Download, Copy, Check, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './PinterestPinModal.css'

const PIN_W = 1000
const PIN_H = 1500

const COLORS = {
  bg: '#fbfaf8',
  shadedRow: '#f1efec',
  title: '#3a3a3a',
  script: '#4a4a4a',
  note: '#2f2f2f',
  syllable: '#a6a6a6',
  brand: '#2f2f2f',
}

const MAX_ROWS = 12

export default function PinterestPinModal({ song, tabs: tabsProp, onClose }) {
  const canvasRef = useRef(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [rendering, setRendering] = useState(true)
  const [tabs, setTabs] = useState(() => tabsProp ?? null)
  const [loadingTabs, setLoadingTabs] = useState(!tabsProp)

  useEffect(() => {
    if (tabsProp) {
      setTabs(tabsProp)
      setLoadingTabs(false)
      return
    }
    if (!song?.id) {
      setTabs([])
      setLoadingTabs(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingTabs(true)
      const { data: versions } = await supabase
        .from('song_versions')
        .select('id, is_default, sort_order, difficulty')
        .eq('song_id', song.id)
        .order('sort_order', { ascending: true })
      if (cancelled) return
      const defaultV =
        versions?.find((v) => v.is_default) || versions?.[0] || null
      if (!defaultV) {
        setTabs([])
        setLoadingTabs(false)
        return
      }
      const { data: tabRows } = await supabase
        .from('tabs')
        .select('*')
        .eq('song_version_id', defaultV.id)
        .order('line_order', { ascending: true })
      if (cancelled) return
      setTabs(tabRows || [])
      setLoadingTabs(false)
    })()
    return () => {
      cancelled = true
    }
  }, [song?.id, tabsProp])

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !song) return

    setRendering(true)
    canvas.width = PIN_W
    canvas.height = PIN_H
    const ctx = canvas.getContext('2d')

    try {
      await Promise.all([
        document.fonts.load('400 72px "Antic Didone"'),
        document.fonts.load('400 52px "Ephesis"'),
        document.fonts.load('400 24px "DM Sans"'),
        document.fonts.load('500 20px "Outfit"'),
        document.fonts.load('700 60px "Outfit"'),
      ])
    } catch {
      /* fallback to system fonts */
    }

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, PIN_W, PIN_H)

    const headerBottom = drawHeader(ctx, song)

    const footerTop = PIN_H - 70
    drawFooter(ctx)

    const bodyTop = headerBottom + 30
    const bodyBottom = footerTop - 30
    const bodyHeight = bodyBottom - bodyTop

    const rows = (tabs || []).slice(0, MAX_ROWS)
    if (rows.length > 0) {
      const rowH = bodyHeight / rows.length
      for (let i = 0; i < rows.length; i++) {
        drawTabRow(ctx, rows[i], bodyTop + i * rowH, rowH, i % 2 === 0)
      }
    } else if (!loadingTabs) {
      ctx.fillStyle = COLORS.syllable
      ctx.font = '400 28px "DM Sans", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        'Tab not available for this song yet.',
        PIN_W / 2,
        bodyTop + bodyHeight / 2
      )
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setRendering(false)
        return
      }
      const url = URL.createObjectURL(blob)
      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setRendering(false)
    }, 'image/png')
  }, [song, tabs, loadingTabs])

  useEffect(() => {
    if (loadingTabs) return
    draw()
  }, [draw, loadingTabs])

  useEffect(() => {
    return () => {
      setDownloadUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleCopy() {
    const canvas = canvasRef.current
    if (
      !canvas ||
      !navigator.clipboard?.write ||
      typeof window.ClipboardItem === 'undefined'
    ) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': blob }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        /* clipboard write may be blocked */
      }
    }, 'image/png')
  }

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const title = song?.title || 'Kalimba Tab'
    const safeTitle = String(title).replace(/[<>&"']/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c])
    )
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100')
    if (!w) return
    w.document.open()
    w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safeTitle} — Kalimba Tab</title>
<style>
  @page { margin: 0; size: auto; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  img { display: block; max-width: 100%; max-height: 100vh; box-shadow: 0 6px 20px -10px rgba(0,0,0,.3); }
  @media print {
    .wrap { padding: 0; min-height: 0; }
    img { max-height: none; width: 100%; box-shadow: none; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="wrap"><img id="tab-img" src="${dataUrl}" alt="${safeTitle} kalimba tab" /></div>
  <script>
    const img = document.getElementById('tab-img');
    function go() { setTimeout(() => { window.focus(); window.print(); }, 150); }
    if (img.complete) go(); else img.addEventListener('load', go);
  </script>
</body>
</html>`)
    w.document.close()
  }

  const canCopy =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard?.write &&
    typeof window !== 'undefined' &&
    typeof window.ClipboardItem !== 'undefined'

  if (!song) return null

  return (
    <div
      className="pin-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Download or print song image"
      onClick={onClose}
    >
      <div className="pin-modal card" onClick={(e) => e.stopPropagation()}>
        <button
          className="pin-modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <X size={18} />
        </button>

        <div className="pin-modal-header">
          <h2 className="pin-modal-title font-title">Download or print</h2>
          <p className="pin-modal-sub">1000 × 1500 · auto-generated from the tab</p>
        </div>

        <div
          className="pin-modal-canvas-wrap"
          aria-busy={rendering || loadingTabs}
        >
          <canvas ref={canvasRef} className="pin-modal-canvas" />
        </div>

        <div className="pin-modal-actions">
          <a
            href={downloadUrl || undefined}
            download={`${song.slug || 'kalimba-tab'}-kalimbaba.png`}
            className={`btn btn-primary${downloadUrl ? '' : ' btn-disabled'}`}
            onClick={(e) => {
              if (!downloadUrl) e.preventDefault()
            }}
          >
            <Download size={16} /> Download PNG
          </a>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handlePrint}
          >
            <Printer size={16} /> Print
          </button>
          {canCopy && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check size={16} /> Copied</>
              ) : (
                <><Copy size={16} /> Copy image</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function drawHeader(ctx, song) {
  const title = (song.title || 'Untitled').toUpperCase()
  const titleSize = fitTitleSize(ctx, title)
  ctx.fillStyle = COLORS.title
  ctx.font = `400 ${titleSize}px "Antic Didone", "Times New Roman", serif`
  const titleTop = 90
  const lineH = titleSize * 1.05
  const titleBottom = wrapAndDrawText(
    ctx,
    title,
    PIN_W / 2,
    titleTop,
    PIN_W - 160,
    lineH,
    0.18
  )

  const subtitle = song.author?.trim() || 'Kalimba Tab'
  ctx.fillStyle = COLORS.script
  const scriptSize = 52
  ctx.font = `400 ${scriptSize}px "Ephesis", cursive`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const scriptY = titleBottom + 62
  ctx.fillText(subtitle, PIN_W / 2, scriptY)

  return scriptY + 20
}

function drawFooter(ctx) {
  ctx.fillStyle = COLORS.brand
  ctx.font = '500 20px "Outfit", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  drawSpacedText(ctx, 'KALIMBABA.COM', PIN_W / 2, PIN_H - 50, 4)
}

function drawTabRow(ctx, tab, y, rowH, shaded) {
  if (shaded) {
    ctx.fillStyle = COLORS.shadedRow
    ctx.fillRect(0, y, PIN_W, rowH)
  }

  const notes = tab?.notes || []
  if (!notes.length) return

  const syls = tab?.syllables || []
  const hasLyrics = syls.some((s) => s && String(s).trim())

  const maxContentW = PIN_W - 140
  const noteFSBase = Math.round(rowH * 0.46)
  const supFSBase = Math.round(noteFSBase * 0.52)
  const sylFSBase = Math.round(rowH * 0.15)

  const measure = (noteFS, supFS, sylFS, pad) => {
    ctx.font = `700 ${noteFS}px "Outfit", sans-serif`
    const noteWidths = notes.map((n) => {
      let w = ctx.measureText(String(n.note ?? '')).width
      if (isOctave(n)) {
        ctx.font = `700 ${supFS}px "Outfit", sans-serif`
        w += ctx.measureText(octaveMark(n)).width
        ctx.font = `700 ${noteFS}px "Outfit", sans-serif`
      }
      return w
    })
    ctx.font = `400 ${sylFS}px "DM Sans", sans-serif`
    const sylWidths = syls.map((s) =>
      s ? ctx.measureText(String(s)).width : 0
    )
    const pairWidths = notes.map((_, i) =>
      Math.max(noteWidths[i], sylWidths[i] || 0)
    )
    const total =
      pairWidths.reduce((a, b) => a + b, 0) +
      pad * Math.max(0, notes.length - 1)
    return { noteWidths, sylWidths, pairWidths, total }
  }

  let noteFS = noteFSBase
  let supFS = supFSBase
  let sylFS = sylFSBase
  let pad = Math.round(rowH * 0.25)
  let m = measure(noteFS, supFS, sylFS, pad)
  if (m.total > maxContentW) {
    const scale = maxContentW / m.total
    noteFS = Math.max(18, Math.round(noteFSBase * scale))
    supFS = Math.max(10, Math.round(supFSBase * scale))
    sylFS = Math.max(10, Math.round(sylFSBase * scale))
    pad = Math.max(8, Math.round(pad * scale))
    m = measure(noteFS, supFS, sylFS, pad)
  }

  const startX = (PIN_W - m.total) / 2
  const noteBaselineY = y + rowH * (hasLyrics ? 0.58 : 0.65)
  const sylBaselineY = y + rowH * 0.88

  let x = startX
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    const pairCenter = x + m.pairWidths[i] / 2
    const noteStartX = pairCenter - m.noteWidths[i] / 2

    ctx.font = `700 ${noteFS}px "Outfit", sans-serif`
    ctx.fillStyle = COLORS.note
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(String(n.note ?? ''), noteStartX, noteBaselineY)

    if (isOctave(n)) {
      const numW = ctx.measureText(String(n.note ?? '')).width
      ctx.font = `700 ${supFS}px "Outfit", sans-serif`
      const supX = noteStartX + numW + 2
      const supY = noteBaselineY - noteFS * 0.55
      ctx.fillText(octaveMark(n), supX, supY)
    }

    if (hasLyrics && syls[i]) {
      ctx.font = `400 ${sylFS}px "DM Sans", sans-serif`
      ctx.fillStyle = COLORS.syllable
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(syls[i]), pairCenter, sylBaselineY)
    }

    x += m.pairWidths[i] + pad
  }
}

function isOctave(n) {
  return n?.octave === 1 || n?.octave === 2 || n?.octave === true
}

function octaveMark(n) {
  return n.octave === 2 ? '°°' : '°'
}

function drawSpacedText(ctx, text, cx, cy, spacing) {
  const chars = String(text).split('')
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total =
    widths.reduce((a, b) => a + b, 0) +
    spacing * Math.max(0, chars.length - 1)
  let x = cx - total / 2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, cy)
    x += widths[i] + spacing
  }
  ctx.textAlign = prevAlign
}

function wrapAndDrawText(ctx, text, cx, topY, maxWidth, lineHeight, letterSpacing = 0) {
  const drawSpacedLine = (line, y) => {
    if (letterSpacing > 0) {
      drawSpacedText(ctx, line, cx, y, letterSpacing * (ctx.measureText('M').width / 20))
    } else {
      ctx.fillText(line, cx, y)
    }
  }

  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    const testWidth = letterSpacing > 0
      ? ctx.measureText(test).width + letterSpacing * (ctx.measureText('M').width / 20) * (test.length - 1)
      : ctx.measureText(test).width
    if (testWidth > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i < lines.length; i++) {
    drawSpacedLine(lines[i], topY + i * lineHeight)
  }
  return topY + lines.length * lineHeight
}

function fitTitleSize(ctx, title) {
  const len = (title || '').length
  if (len <= 10) return 78
  if (len <= 16) return 70
  if (len <= 24) return 62
  if (len <= 34) return 54
  if (len <= 48) return 46
  return 40
}
