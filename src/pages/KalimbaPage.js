import { useState, useRef } from 'react'
import SEO from '../components/SEO'
import './KalimbaPage.css'

// 17-key C major kalimba — standard alternating layout
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

function tineHeight(index) {
  // center (index 8) = shortest, edges = tallest
  return 72 + Math.abs(index - 8) * 14
}

export default function KalimbaPage() {
  const audioCtxRef = useRef(null)
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [lastNote, setLastNote] = useState(null)

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

  function playNote(freq) {
    const ctx = getCtx()
    const now = ctx.currentTime

    const masterGain = ctx.createGain()
    masterGain.gain.value = 1.0
    masterGain.connect(ctx.destination)

    // 1. Fundamental tone
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    
    // Simulate the pluck tension: pitch drops very slightly immediately after release
    osc1.frequency.setValueAtTime(freq * 1.03, now)
    osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.04)
    
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.005)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 3.0)
    
    osc1.connect(gain1)
    gain1.connect(masterGain)
    osc1.start(now)
    osc1.stop(now + 3.2)

    // 2. First Inharmonic Overtone (Typical of a clamped bar: ~2.756 * fundamental)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freq * 2.756, now)
    
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.005)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    
    osc2.connect(gain2)
    gain2.connect(masterGain)
    osc2.start(now)
    osc2.stop(now + 0.7)

    // 3. Second Inharmonic Overtone (The sharp initial metallic "click": ~5.404 * fundamental)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    // Using a triangle for the highest overtone gives it a bit more "bite"
    osc3.type = 'triangle' 
    osc3.frequency.setValueAtTime(freq * 5.404, now)
    
    gain3.gain.setValueAtTime(0, now)
    gain3.gain.linearRampToValueAtTime(0.15, now + 0.002)
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    
    osc3.connect(gain3)
    gain3.connect(masterGain)
    osc3.start(now)
    osc3.stop(now + 0.2)
  }

  function handleClick(tine, index) {
    playNote(tine.freq)
    setLastNote({ note: tine.note, octave: tine.octave })
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
    <div className="kalimba-page">
      <SEO
        title="Virtual Kalimba — Play Online Free"
        description="Play a free virtual 17-key C major kalimba in your browser. Click any tine to hear the note. No app or download needed."
        canonicalPath="/kalimba"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Virtual Kalimba',
          url: 'https://kalimbaba.com/kalimba',
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
      <div className="container">

        <header className="kalimba-header">
          <h1 className="kalimba-title">Virtual Kalimba</h1>
          <p className="kalimba-sub">Click any key to play</p>
        </header>

        <div className="note-display">
          {lastNote ? (
            <>
              <span className="note-display-label">Playing</span>
              <span className="note-display-note">
                {lastNote.note}
                {lastNote.octave === 2 ? <sup>°°</sup> : lastNote.octave === 1 ? <sup>°</sup> : null}
              </span>
            </>
          ) : (
            <span className="note-display-hint">— tap a key —</span>
          )}
        </div>

        <div className="kalimba-wrap">
          <div className="kalimba">
            <div className="kalimba-keys">
              {TINES.map((tine, i) => (
                <div
                  key={i}
                  className={`tine ${activeKeys.has(i) ? 'active' : ''}`}
                  style={{ height: tineHeight(i) }}
                  onClick={() => handleClick(tine, i)}
                  role="button"
                  aria-label={`Play ${tine.note}${tine.octave === 2 ? '°°' : tine.octave === 1 ? '°' : ''}`}
                >
                  <span className="tine-label">
                    {tine.note}
                    {tine.octave === 2 ? <sup>°°</sup> : tine.octave === 1 ? <sup>°</sup> : null}
                  </span>
                </div>
              ))}
            </div>
            <div className="kalimba-base">
              <span className="kalimba-brand">17 Key · C Major</span>
            </div>
          </div>
        </div>

        <p className="kalimba-tip">
          Numbers with <sup>°</sup> are higher octave · <sup>°°</sup> is the highest octave
        </p>

      </div>
    </div>
  )
}
