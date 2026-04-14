import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import './KalimbaPage.css'

// 17-key C major kalimba — standard alternating layout (equal temperament, Hz ≈ concert pitch)
const TINES = [
  { note: '2', octave: 2, freq: 1174.66 },  // D6
  { note: '7', octave: 1, freq: 987.77 },   // B5
  { note: '5', octave: 1, freq: 783.99 },   // G5
  { note: '3', octave: 1, freq: 659.25 },   // E5
  { note: '1', octave: 1, freq: 523.25 },   // C5
  { note: '6', octave: 0, freq: 440.00 },   // A4
  { note: '4', octave: 0, freq: 349.23 },   // F4
  { note: '2', octave: 0, freq: 293.66 },   // D4
  { note: '1', octave: 0, freq: 261.63 },   // C4 (Center)
  { note: '3', octave: 0, freq: 329.63 },   // E4
  { note: '5', octave: 0, freq: 392.00 },   // G4
  { note: '7', octave: 0, freq: 493.88 },   // B4
  { note: '2', octave: 1, freq: 587.33 },   // D5
  { note: '4', octave: 1, freq: 698.46 },   // F5
  { note: '6', octave: 1, freq: 880.00 },   // A5
  { note: '1', octave: 2, freq: 1046.50 },  // C6
  { note: '3', octave: 2, freq: 1318.51 },  // E6
]

/** Fixed Do (C major): degree → solfege syllables (two common spellings). */
const SOLFEGE_BY_STYLE = {
  /** So, Ti — common in English-language teaching. */
  soTi: {
    '1': 'Do',
    '2': 'Re',
    '3': 'Mi',
    '4': 'Fa',
    '5': 'So',
    '6': 'La',
    '7': 'Ti',
  },
  /** Sol, Si — Vietnam, France, Italy, Spain, and others. */
  solSi: {
    '1': 'Do',
    '2': 'Re',
    '3': 'Mi',
    '4': 'Fa',
    '5': 'Sol',
    '6': 'La',
    '7': 'Si',
  },
}

const SOLFEGE_SCALE_ORDER = {
  soTi: ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti'],
  solSi: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
}

const VALID_SOLFEGE_STYLES = new Set(['soTi', 'solSi'])

const DEGREE_LETTER = {
  '1': 'C',
  '2': 'D',
  '3': 'E',
  '4': 'F',
  '5': 'G',
  '6': 'A',
  '7': 'B',
}

/** Scale degree 1–7 (C major) → pitch class (12-TET). */
const DEGREE_PITCH_CLASS = {
  '1': 0,
  '2': 2,
  '3': 4,
  '4': 5,
  '5': 7,
  '6': 9,
  '7': 11,
}

const LETTER_TO_PC = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11]

function majorScalePitchClasses(tonicPc) {
  return MAJOR_SCALE_INTERVALS.map((i) => (tonicPc + i) % 12)
}

/** @param {'soTi' | 'solSi'} style */
function movableSolfegeForPitch(notePc, tonicPc, style) {
  const order = SOLFEGE_SCALE_ORDER[style]
  const byDeg = SOLFEGE_BY_STYLE[style]
  const scale = majorScalePitchClasses(tonicPc)
  const idx = scale.indexOf(notePc)
  if (idx >= 0) return order[idx]
  const entry = Object.entries(DEGREE_PITCH_CLASS).find(([, pc]) => pc === notePc)
  return entry ? byDeg[entry[0]] : '—'
}

function normalizeSolfegeStyle(/** @type {unknown} */ v) {
  return v === 'solSi' ? 'solSi' : 'soTi'
}

/** @typedef {{ showSolfege: boolean, solfegeMovable: boolean, solfegeStyle: 'soTi' | 'solSi', showLetters: boolean, showDegrees: boolean, movableTonic: string }} NotationPrefs */

const NOTATION_STORAGE_KEY = 'kalimbaba.kalimba.notation'
const LEGACY_MUSICAL_SYSTEM_KEY = 'kalimbaba.kalimba.musicalSystem'
const LEGACY_MOVABLE_TONIC_KEY = 'kalimbaba.kalimba.movableTonic'

const VALID_LEGACY_MUSICAL_SYSTEMS = new Set([
  'solfegeLetterNumber',
  'letterNumber',
  'degreeOnly',
  'movableDo',
])

const DEFAULT_NOTATION_PREFS = {
  showSolfege: false,
  solfegeMovable: false,
  solfegeStyle: /** @type {'soTi' | 'solSi'} */ ('soTi'),
  showLetters: false,
  showDegrees: true,
  movableTonic: 'C',
}

function legacyMusicalSystemToPrefs(legacySystem, tonicLetter) {
  const t =
    tonicLetter && LETTER_TO_PC[/** @type {keyof typeof LETTER_TO_PC} */ (tonicLetter)] !== undefined
      ? tonicLetter
      : 'C'
  const base = { ...DEFAULT_NOTATION_PREFS, movableTonic: t }
  switch (legacySystem) {
    case 'letterNumber':
      return { ...base, showSolfege: false, showLetters: true, showDegrees: true }
    case 'degreeOnly':
      return { ...base, showSolfege: false, showLetters: false, showDegrees: true }
    case 'movableDo':
      return {
        ...base,
        showSolfege: true,
        showLetters: true,
        showDegrees: true,
        solfegeMovable: true,
      }
    case 'solfegeLetterNumber':
    default:
      return {
        ...base,
        showSolfege: true,
        showLetters: true,
        showDegrees: true,
        solfegeMovable: false,
      }
  }
}

function parseNotationPrefs(/** @type {unknown} */ raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const prefs = { ...DEFAULT_NOTATION_PREFS }
  if (typeof o.showSolfege === 'boolean') prefs.showSolfege = o.showSolfege
  if (typeof o.solfegeMovable === 'boolean') prefs.solfegeMovable = o.solfegeMovable
  if (typeof o.solfegeStyle === 'string' && VALID_SOLFEGE_STYLES.has(o.solfegeStyle)) {
    prefs.solfegeStyle = /** @type {'soTi' | 'solSi'} */ (o.solfegeStyle)
  }
  if (typeof o.showLetters === 'boolean') prefs.showLetters = o.showLetters
  if (typeof o.showDegrees === 'boolean') prefs.showDegrees = o.showDegrees
  if (
    typeof o.movableTonic === 'string' &&
    LETTER_TO_PC[/** @type {keyof typeof LETTER_TO_PC} */ (o.movableTonic)] !== undefined
  ) {
    prefs.movableTonic = o.movableTonic
  }
  return prefs
}

function loadNotationPrefs() {
  try {
    const json = localStorage.getItem(NOTATION_STORAGE_KEY)
    if (json) {
      const parsed = parseNotationPrefs(JSON.parse(json))
      if (parsed) return parsed
    }
    const legacySys = localStorage.getItem(LEGACY_MUSICAL_SYSTEM_KEY)
    if (legacySys && VALID_LEGACY_MUSICAL_SYSTEMS.has(legacySys)) {
      let tonic = 'C'
      const mt = localStorage.getItem(LEGACY_MOVABLE_TONIC_KEY)
      if (mt && LETTER_TO_PC[/** @type {keyof typeof LETTER_TO_PC} */ (mt)] !== undefined) {
        tonic = mt
      }
      return legacyMusicalSystemToPrefs(legacySys, tonic)
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_NOTATION_PREFS }
}

function persistNotationPrefs(/** @type {NotationPrefs} */ prefs) {
  try {
    localStorage.setItem(NOTATION_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

function notationForTine(/** @type {{ note: string }} */ tine, /** @type {NotationPrefs} */ prefs) {
  const letter = DEGREE_LETTER[tine.note] ?? tine.note
  const pc = DEGREE_PITCH_CLASS[tine.note] ?? 0
  const style = normalizeSolfegeStyle(prefs.solfegeStyle)
  const byDeg = SOLFEGE_BY_STYLE[style]
  let solfege = byDeg[tine.note] ?? tine.note
  if (prefs.showSolfege && prefs.solfegeMovable) {
    const k = /** @type {keyof typeof LETTER_TO_PC} */ (prefs.movableTonic)
    solfege = movableSolfegeForPitch(pc, LETTER_TO_PC[k] ?? 0, style)
  }
  return {
    solfege,
    letter,
    showSolfege: prefs.showSolfege,
    showLetter: prefs.showLetters,
    showDegree: prefs.showDegrees,
  }
}

function kalimbaTabLabel(/** @type {{ note: string, octave: number }} */ tine) {
  return `${tine.note}${tine.octave === 2 ? '°°' : tine.octave === 1 ? '°' : ''}`
}

/** Tines hang from a top bridge: center longest, sides slightly shorter (gentle V, small length spread). */
function tineHeight(index) {
  const center = 8
  const dist = Math.abs(index - center)
  const maxH = 458
  const minH = 318
  return minH + ((center - dist) / center) * (maxH - minH)
}

/** When the card is in a narrow column (~half a desktop window), stretch keys vertically and share width. */
const KALIMBA_COMPACT_PX = 600
const KALIMBA_COMPACT_HEIGHT_SCALE = 1.18

/** Default: middle row … F H G J … (H = center C4 / degree 1), Z–V left, B–N right. */
const DEFAULT_BINDING_CODES = [
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyH',
  'KeyG',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
  'Quote',
  'KeyB',
  'KeyN',
]

const KEY_BINDINGS_STORAGE_KEY = 'kalimbaba.kalimba.keyBindings'
/** When set, "Reset to defaults" restores this keyboard layout instead of the built-in app layout. */
const KEY_BINDINGS_USER_DEFAULT_KEY = 'kalimbaba.kalimba.keyBindingsUserDefault'

const CODES_NOT_ASSIGNABLE = new Set([
  'Escape',
  'Tab',
  'CapsLock',
  'ContextMenu',
  'OSLeft',
  'OSRight',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

function validateBindingCodesArray(arr) {
  if (!Array.isArray(arr) || arr.length !== TINES.length) return null
  if (!arr.every((c) => typeof c === 'string' && c.length > 0)) return null
  if (new Set(arr).size !== arr.length) return null
  if (!arr.every((c) => !CODES_NOT_ASSIGNABLE.has(c))) return null
  return arr
}

const CODE_LABEL_OVERRIDES = {
  Semicolon: ';',
  Quote: "'",
  Slash: '/',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Space: 'Space',
}

function codeToLabel(code) {
  if (CODE_LABEL_OVERRIDES[code]) return CODE_LABEL_OVERRIDES[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return code.replace('Numpad', 'Num·')
  return code
}

function loadSavedBindingCodes() {
  try {
    const raw = localStorage.getItem(KEY_BINDINGS_STORAGE_KEY)
    if (!raw) return null
    return validateBindingCodesArray(JSON.parse(raw))
  } catch {
    return null
  }
}

function loadUserDefaultBindingCodes() {
  try {
    const raw = localStorage.getItem(KEY_BINDINGS_USER_DEFAULT_KEY)
    if (!raw) return null
    return validateBindingCodesArray(JSON.parse(raw))
  } catch {
    return null
  }
}

function persistUserDefaultBindingCodes(codes) {
  try {
    localStorage.setItem(KEY_BINDINGS_USER_DEFAULT_KEY, JSON.stringify(codes))
  } catch {
    /* ignore */
  }
}

function clearUserDefaultBindingCodes() {
  try {
    localStorage.removeItem(KEY_BINDINGS_USER_DEFAULT_KEY)
  } catch {
    /* ignore */
  }
}

function persistBindingCodes(codes) {
  try {
    localStorage.setItem(KEY_BINDINGS_STORAGE_KEY, JSON.stringify(codes))
  } catch {
    /* ignore quota / private mode */
  }
}

function isEditableKeyboardTarget(/** @type {EventTarget | null} */ target) {
  if (!target || !(target instanceof HTMLElement)) return false
  if (target.closest('.kalimba-kbd-settings')) return true
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

export default function KalimbaPage({ embedded = false, onNotePlayed = null } = {}) {
  const onNotePlayedRef = useRef(onNotePlayed)
  onNotePlayedRef.current = onNotePlayed

  const audioCtxRef = useRef(null)
  const kalimbaWrapRef = useRef(null)
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [compactLayout, setCompactLayout] = useState(false)
  const [bindingCodes, setBindingCodes] = useState(
    () => loadSavedBindingCodes() ?? [...DEFAULT_BINDING_CODES],
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notationPrefs, setNotationPrefsState] = useState(loadNotationPrefs)
  const [assigningTineIndex, setAssigningTineIndex] = useState(null)
  const [hasUserKeyboardDefault, setHasUserKeyboardDefault] = useState(
    () => loadUserDefaultBindingCodes() !== null,
  )

  const clearKeyCaptureOnly = useCallback(() => {
    setAssigningTineIndex(null)
  }, [])

  const stopKeyAssignMode = useCallback(() => {
    setAssigningTineIndex(null)
  }, [])

  const beginAssignTineIndex = useCallback((/** @type {number} */ index) => {
    setAssigningTineIndex(index)
  }, [])

  const patchNotationPrefs = useCallback((/** @type {Partial<NotationPrefs>} */ partial) => {
    setNotationPrefsState((prev) => {
      const next = { ...prev, ...partial }
      persistNotationPrefs(next)
      return next
    })
  }, [])

  const keyLabels = useMemo(
    () => bindingCodes.map((code) => codeToLabel(code)),
    [bindingCodes],
  )

  const codeToTineRef = useRef({})
  codeToTineRef.current = Object.fromEntries(
    bindingCodes.map((code, i) => [code, i]),
  )

  const bindingCodesRef = useRef(bindingCodes)
  bindingCodesRef.current = bindingCodes

  const updateBindings = useCallback((next) => {
    setBindingCodes(next)
    persistBindingCodes(next)
  }, [])

  const saveCurrentKeyboardAsDefault = useCallback(() => {
    const codes = [...bindingCodesRef.current]
    if (!validateBindingCodesArray(codes)) return
    persistUserDefaultBindingCodes(codes)
    setHasUserKeyboardDefault(true)
  }, [])

  const clearSavedKeyboardDefault = useCallback(() => {
    clearUserDefaultBindingCodes()
    setHasUserKeyboardDefault(false)
  }, [])

  const resetKalimbaSettingsToDefaults = useCallback(() => {
    const prefs = { ...DEFAULT_NOTATION_PREFS }
    setNotationPrefsState(prefs)
    persistNotationPrefs(prefs)
    const kbd =
      loadUserDefaultBindingCodes() ?? [...DEFAULT_BINDING_CODES]
    updateBindings(kbd)
    stopKeyAssignMode()
  }, [updateBindings, stopKeyAssignMode])

  useLayoutEffect(() => {
    const el = kalimbaWrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const w = el.getBoundingClientRect().width
      setCompactLayout(w > 0 && w < KALIMBA_COMPACT_PX)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function getCtx() {
    if (!audioCtxRef.current) {
      const w = /** @type {any} */ (window)
      const AudioCtx = w.AudioContext || w.webkitAudioContext
      audioCtxRef.current = new AudioCtx()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  /**
   * Clearer kalimba voice: short decays, faster body swell, light presence lift, and softer very-high
   * partials so pitch stays defined. Heard pitch matches `freq` (concert ET). The ~2× partial group is
   * −2 semitones vs a strict octave (warmer, less “hollow” than 2:1).
   */
  function playNote(freq) {
    const ctx = getCtx()
    const now = ctx.currentTime
    const fPlay = freq
    /** −2 semitones applied to ratios near 2× (the “2” partials). */
    const lower2 = 2 ** (-2 / 12)
    const fundTail = Math.min(2.05, 0.44 + 400 / freq)
    const resTail = Math.min(3.25, 0.82 + 720 / freq)

    const master = ctx.createGain()
    master.gain.value = 0.36
    master.connect(ctx.destination)

    const glass = ctx.createBiquadFilter()
    glass.type = 'peaking'
    glass.frequency.value = 8400
    glass.Q.value = 0.88
    glass.gain.value = 4.2
    glass.connect(master)

    const air = ctx.createBiquadFilter()
    air.type = 'highshelf'
    air.frequency.value = 5600
    air.gain.value = 5.2
    air.connect(glass)

    const outLP = ctx.createBiquadFilter()
    outLP.type = 'lowpass'
    outLP.frequency.value = Math.min(17200, 12200 + fPlay * 13)
    outLP.Q.value = 0.1
    outLP.connect(air)

    const scoop = ctx.createBiquadFilter()
    scoop.type = 'peaking'
    scoop.frequency.value = 520
    scoop.Q.value = 0.55
    scoop.gain.value = -5.5
    scoop.connect(outLP)

    const presence = ctx.createBiquadFilter()
    presence.type = 'peaking'
    presence.frequency.value = Math.min(3400, 900 + fPlay * 2.2)
    presence.Q.value = 0.72
    presence.gain.value = 2.4
    presence.connect(scoop)

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 190
    hp.Q.value = 0.38
    hp.connect(presence)

    const sr = ctx.sampleRate

    function makePingBuffer(fPing, lenMs, power) {
      const n = Math.max(24, Math.floor(sr * lenMs))
      const buf = ctx.createBuffer(1, n, sr)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < n; i++) {
        const t = i / n
        const env = Math.sin(t * Math.PI) ** power * (1 - t) ** 0.85
        ch[i] = Math.sin((2 * Math.PI * fPing * i) / sr) * env
      }
      return buf
    }

    // Layered glass “plink” — high, percussive (kalimba attack, not hammered string)
    const pingG = ctx.createGain()
    pingG.connect(hp)
    ;[
      { mul: 5.15, ms: 0.0022, p: 1.15, g: 0.27 },
      { mul: 8.75, ms: 0.0016, p: 1.4, g: 0.2 },
    ].forEach(({ mul, ms, p, g }) => {
      const fPing = Math.min(12800, fPlay * mul)
      const src = ctx.createBufferSource()
      src.buffer = makePingBuffer(fPing, ms, p)
      const gg = ctx.createGain()
      gg.gain.setValueAtTime(0, now)
      gg.gain.linearRampToValueAtTime(g, now + 0.00025)
      gg.gain.exponentialRampToValueAtTime(0.00035, now + 0.0065)
      src.connect(gg)
      gg.connect(pingG)
      src.start(now)
      src.stop(now + ms + 0.02)
    })

    function sineBlip(ratio, peak, attackMs, endTime) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const f = fPlay * ratio
      osc.frequency.setValueAtTime(f, now)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(peak, now + attackMs)
      g.gain.exponentialRampToValueAtTime(0.00045, endTime)
      osc.connect(g)
      g.connect(hp)
      osc.start(now)
      osc.stop(endTime + 0.06)
    }

    /** Acrylic plate resonance: slow swell, long decay on the fundamental. */
    function sineResonantBody(endTime) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(fPlay, now)
      const g = ctx.createGain()
      const peak = 0.102
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(peak * 0.22, now + 0.018)
      g.gain.linearRampToValueAtTime(peak, now + 0.095)
      g.gain.exponentialRampToValueAtTime(0.0001, endTime)
      osc.connect(g)
      g.connect(hp)
      osc.start(now)
      osc.stop(endTime + 0.12)
    }

    /** Quiet 2nd partial — adds “body” ring without harshness. */
    function sineResonantHarmonic(mult, peak, endTime) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(fPlay * mult, now)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(peak * 0.1, now + 0.032)
      g.gain.linearRampToValueAtTime(peak, now + 0.12)
      g.gain.exponentialRampToValueAtTime(0.00009, endTime)
      osc.connect(g)
      g.connect(hp)
      osc.start(now)
      osc.stop(endTime + 0.12)
    }

    sineBlip(1, 0.38, 0.00038, now + fundTail)
    sineResonantBody(now + resTail)
    sineResonantHarmonic(2 * lower2, 0.024, now + resTail)
    sineBlip(2.04 * lower2, 0.034, 0.00032, now + Math.min(0.18, 0.065 + 48 / freq))
    sineBlip(6.25, 0.022, 0.00028, now + Math.min(0.14, 0.052 + 36 / freq))
  }

  const playNoteRef = useRef(playNote)
  playNoteRef.current = playNote

  useEffect(() => {
    if (assigningTineIndex !== null) return undefined

    function onKeyDown(/** @type {KeyboardEvent} */ e) {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (isEditableKeyboardTarget(e.target)) return
      const tineIndex = codeToTineRef.current[e.code]
      if (tineIndex === undefined) return
      e.preventDefault()
      const tine = TINES[tineIndex]
      playNoteRef.current(tine.freq)
      onNotePlayedRef.current?.({ note: tine.note, octave: tine.octave })
      setActiveKeys((prev) => new Set(prev).add(tineIndex))
    }
    function onKeyUp(/** @type {KeyboardEvent} */ e) {
      const tineIndex = codeToTineRef.current[e.code]
      if (tineIndex === undefined) return
      e.preventDefault()
      setActiveKeys((prev) => {
        const next = new Set(prev)
        next.delete(tineIndex)
        return next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [assigningTineIndex])

  useEffect(() => {
    if (assigningTineIndex === null) return undefined

    function onCaptureKeyDown(/** @type {KeyboardEvent} */ e) {
      if (e.code === 'Escape') {
        e.preventDefault()
        clearKeyCaptureOnly()
        return
      }
      if (e.repeat || CODES_NOT_ASSIGNABLE.has(e.code)) return

      e.preventDefault()
      e.stopPropagation()

      const code = e.code
      const i = assigningTineIndex
      const next = [...bindingCodesRef.current]
      const prevCode = next[i]
      const j = next.indexOf(code)
      if (j !== -1 && j !== i) {
        next[j] = prevCode
      }
      next[i] = code
      updateBindings(next)
      clearKeyCaptureOnly()
    }

    window.addEventListener('keydown', onCaptureKeyDown, true)
    return () => window.removeEventListener('keydown', onCaptureKeyDown, true)
  }, [assigningTineIndex, updateBindings, clearKeyCaptureOnly])

  useEffect(() => {
    if (assigningTineIndex === null) return
    document
      .getElementById(`kalimba-tine-${assigningTineIndex}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [assigningTineIndex])

  function handleClick(tine, index) {
    playNote(tine.freq)
    onNotePlayedRef.current?.({ note: tine.note, octave: tine.octave })
    setActiveKeys(prev => new Set([...prev, index]))
    setTimeout(() => {
      setActiveKeys(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }, 700)
  }

  return (
    <div className={`kalimba-page${embedded ? ' kalimba-page--embedded' : ''}`}>
      {!embedded ? (
        <SEO
          title="Virtual Kalimba — Play Online Free"
          description="Play a free virtual 17-key C major kalimba. Show solfege (So/Ti or Sol/Si), letter names, and/or scale degrees; map your own PC keyboard. No download needed."
          canonicalPath="/tools/virtual-kalimba"
          schema={{
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Virtual Kalimba',
            url: 'https://kalimbaba.com/tools/virtual-kalimba',
            description: 'A free interactive 17-key kalimba you can play in your browser.',
            applicationCategory: 'MusicApplication',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Kalimbaba',
              url: 'https://kalimbaba.com',
            },
          }}
        />
      ) : null}
      <div className={embedded ? 'kalimba-embed-container' : 'container'}>

        <div
          ref={kalimbaWrapRef}
          className="kalimba-wrap"
          data-compact={compactLayout ? 'true' : undefined}
          data-embedded={embedded ? 'true' : undefined}
        >
          <div className="kalimba">
            <header className="kalimba-header">
              {embedded ? (
                <div className="kalimba-header-embed-row">
                  <h2 className="kalimba-title-embed font-title">Virtual Kalimba</h2>
                  <div className="kalimba-header-embed-actions">
                    <Link
                      to="/tools/virtual-kalimba"
                      className="kalimba-embed-open-full font-nav"
                    >
                      Full page
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <p className="kalimba-breadcrumb font-nav">
                    <Link to="/tools">Tools</Link>
                    <span className="kalimba-breadcrumb-sep" aria-hidden="true">
                      /
                    </span>
                    <span>Virtual Kalimba</span>
                  </p>
                  <h1 className="kalimba-title font-title">Virtual Kalimba</h1>
                  <p className="kalimba-sub font-body">
                    Press keys on your keyboard to play. Open <strong>Settings</strong> to change options.
                  </p>
                </>
              )}
              <div className="kalimba-kbd-settings-toolbar">
                <button
                  type="button"
                  className="kalimba-kbd-settings-toggle"
                  aria-expanded={settingsOpen}
                  onClick={() => {
                    setSettingsOpen((o) => !o)
                    stopKeyAssignMode()
                  }}
                >
                  {settingsOpen ? 'Hide settings' : 'Settings'}
                </button>
              </div>
              {settingsOpen ? (
                <section className="kalimba-kbd-settings" aria-label="Kalimba settings">
                  <fieldset className="kalimba-settings-notation">
                    <legend className="kalimba-settings-heading">Notation on each tine</legend>
                    <label className="kalimba-settings-check">
                      <input
                        type="checkbox"
                        checked={notationPrefs.showSolfege}
                        onChange={(e) => patchNotationPrefs({ showSolfege: e.target.checked })}
                      />
                      Solfege (Do, Re, Mi…)
                    </label>
                    {notationPrefs.showSolfege ? (
                      <div className="kalimba-settings-nested" role="group" aria-label="Solfege mode">
                        <label className="kalimba-settings-radio">
                          <input
                            type="radio"
                            name="kalimba-solfege-style"
                            checked={notationPrefs.solfegeStyle === 'soTi'}
                            onChange={() => patchNotationPrefs({ solfegeStyle: 'soTi' })}
                          />
                          <span>
                            So / Ti{' '}
                            <span className="kalimba-settings-radio-scale">
                              (Do Re Mi Fa So La Ti Do)
                            </span>
                          </span>
                        </label>
                        <label className="kalimba-settings-radio">
                          <input
                            type="radio"
                            name="kalimba-solfege-style"
                            checked={notationPrefs.solfegeStyle === 'solSi'}
                            onChange={() => patchNotationPrefs({ solfegeStyle: 'solSi' })}
                          />
                          <span>
                            Sol / Si{' '}
                            <span className="kalimba-settings-radio-scale">
                              (Do Re Mi Fa Sol La Si Do)
                            </span>
                          </span>
                        </label>
                        <label className="kalimba-settings-radio">
                          <input
                            type="radio"
                            name="kalimba-solfege-mode"
                            checked={!notationPrefs.solfegeMovable}
                            onChange={() => patchNotationPrefs({ solfegeMovable: false })}
                          />
                          Fixed Do (C major)
                        </label>
                        <label className="kalimba-settings-radio">
                          <input
                            type="radio"
                            name="kalimba-solfege-mode"
                            checked={notationPrefs.solfegeMovable}
                            onChange={() => patchNotationPrefs({ solfegeMovable: true })}
                          />
                          Movable Do
                        </label>
                        {notationPrefs.solfegeMovable ? (
                          <>
                            <label
                              className="kalimba-settings-label"
                              htmlFor="kalimba-movable-tonic"
                            >
                              Tonic (Do =)
                            </label>
                            <select
                              id="kalimba-movable-tonic"
                              className="kalimba-settings-select"
                              value={notationPrefs.movableTonic}
                              onChange={(e) =>
                                patchNotationPrefs({ movableTonic: e.target.value })
                              }
                            >
                              {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((L) => (
                                <option key={L} value={L}>
                                  {L}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="kalimba-settings-check">
                      <input
                        type="checkbox"
                        checked={notationPrefs.showLetters}
                        onChange={(e) => patchNotationPrefs({ showLetters: e.target.checked })}
                      />
                      Letter names (C–B)
                    </label>
                    <label className="kalimba-settings-check">
                      <input
                        type="checkbox"
                        checked={notationPrefs.showDegrees}
                        onChange={(e) => patchNotationPrefs({ showDegrees: e.target.checked })}
                      />
                      Scale degrees (1–7, ° = higher octave)
                    </label>
                  </fieldset>

                  <h2 className="kalimba-settings-heading kalimba-settings-heading--kbd">
                    Computer keyboard
                  </h2>
                  <div className="kalimba-kbd-tutorial" aria-label="How to map PC keys">
                    <div className="kalimba-kbd-tutorial__steps" role="list">
                      <div className="kalimba-kbd-tutorial__step" role="listitem">
                        <span className="kalimba-kbd-tutorial__badge" aria-hidden="true">
                          1
                        </span>
                        <span className="kalimba-kbd-tutorial__label">Click</span>
                        <span className="kalimba-kbd-tutorial__key-mock" aria-hidden="true">
                          ---
                        </span>
                        <span className="kalimba-kbd-tutorial__label">on a key</span>
                      </div>
                      <span className="kalimba-kbd-tutorial__arrow" aria-hidden="true">
                        →
                      </span>
                      <div className="kalimba-kbd-tutorial__step" role="listitem">
                        <span className="kalimba-kbd-tutorial__badge" aria-hidden="true">
                          2
                        </span>
                        <span className="kalimba-kbd-tutorial__label">Press your keyboard key</span>
                      </div>
                    </div>
                  </div>
                  <div className="kalimba-kbd-settings-actions">
                    <button
                      type="button"
                      className="kalimba-kbd-settings-save-default"
                      onClick={saveCurrentKeyboardAsDefault}
                      title="Save current key map as your personal default (used when you Reset to defaults)"
                    >
                      Save current layout as my default
                    </button>
                    <button
                      type="button"
                      className="kalimba-kbd-settings-reset"
                      onClick={resetKalimbaSettingsToDefaults}
                      title={
                        hasUserKeyboardDefault
                          ? 'Restore notation to app defaults and keyboard to your saved default layout'
                          : 'Restore keyboard layout and notation to app defaults'
                      }
                    >
                      Reset to defaults
                    </button>
                    {hasUserKeyboardDefault ? (
                      <button
                        type="button"
                        className="kalimba-kbd-settings-clear-default"
                        onClick={clearSavedKeyboardDefault}
                        title="Remove your saved default so Reset uses the built-in app keyboard layout"
                      >
                        Clear saved default
                      </button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </header>
            <div className="kalimba-keys" data-kbd-map={settingsOpen ? 'true' : undefined}>
              {TINES.map((tine, i) => {
                const n = notationForTine(tine, notationPrefs)
                const tab = kalimbaTabLabel(tine)
                const ariaExtra = []
                if (n.showSolfege) ariaExtra.push(n.solfege)
                if (n.showLetter) ariaExtra.push(n.letter)
                const ariaMid = ariaExtra.length ? ` ${ariaExtra.join(', ')}.` : ''
                const listeningSquare = settingsOpen && assigningTineIndex === i
                const tineAria = settingsOpen
                  ? `Play ${tab}.${ariaMid} Click the small square on top to change the PC key (now ${keyLabels[i]}).`
                  : `Play ${tab}.${ariaMid} Computer key ${keyLabels[i]}.`
                return (
                  <div
                    id={`kalimba-tine-${i}`}
                    key={i}
                    className={`tine ${activeKeys.has(i) ? 'active' : ''}${
                      listeningSquare ? ' tine--kbd-square-listening' : ''
                    }`}
                    style={{
                      height:
                        tineHeight(i) *
                        (compactLayout ? KALIMBA_COMPACT_HEIGHT_SCALE : 1),
                    }}
                    onClick={() => handleClick(tine, i)}
                    role={settingsOpen ? undefined : 'button'}
                    tabIndex={settingsOpen ? undefined : 0}
                    aria-label={tineAria}
                  >
                    {settingsOpen ? (
                      <button
                        type="button"
                        className={`tine-kbd tine-kbd--square font-body${
                          listeningSquare ? ' tine-kbd--square-listening' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          beginAssignTineIndex(i)
                        }}
                        title="Remap: click, then press a key"
                        aria-label={`Change PC key for ${tab}, currently ${keyLabels[i]}. Click, then press a new key.`}
                      >
                        {keyLabels[i]}
                      </button>
                    ) : (
                      <span className="tine-kbd font-body" aria-hidden="true">
                        {keyLabels[i]}
                      </span>
                    )}
                    {n.showSolfege || n.showLetter || n.showDegree ? (
                      <div className="tine-theory tine-theory--foot" aria-hidden="true">
                        {n.showSolfege ? (
                          <span className="tine-theory__sol">{n.solfege}</span>
                        ) : null}
                        {n.showLetter ? (
                          <span className="tine-theory__letter">{n.letter}</span>
                        ) : null}
                        {n.showDegree ? (
                          <span className="tine-theory__deg">
                            {tine.note}
                            {tine.octave === 2 ? <sup>°°</sup> : tine.octave === 1 ? <sup>°</sup> : null}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <p
              className={`kalimba-caption font-script${embedded ? ' kalimba-caption--embed' : ''}`}
            >
              17 keys · C major
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
