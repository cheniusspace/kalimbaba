/** Tab rows from DB use note 1–7 and octave 0 / 1 (°) / 2 (°°); `octave` may be `true` for ° in older data. */

export function normalizeTabOctave(o) {
  if (o === true || o === 1) return 1
  if (o === 2) return 2
  return 0
}

/**
 * @param {{ note: string, octave?: unknown }} a
 * @param {{ note: string, octave?: unknown }} b
 */
export function tabNotesEqual(a, b) {
  return (
    String(a.note) === String(b.note) && normalizeTabOctave(a.octave) === normalizeTabOctave(b.octave)
  )
}
