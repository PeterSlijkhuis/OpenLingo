/** Split a listening script into turns; "Naam: tekst" lines become separate speakers. */
export function scriptTurns(script: string): { speaker: string; text: string }[] {
  return script
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^([A-ZÀ-Ý][\p{L} .'-]{0,30}):\s+(.+)$/u.exec(line)
      return m ? { speaker: m[1], text: m[2] } : { speaker: '', text: line }
    })
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function dutchVoices(): SpeechSynthesisVoice[] {
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('nl'))
}

/**
 * Read a script aloud with the browser's own Dutch voices. Different speakers get different
 * voices when the device has several, otherwise a different pitch.
 */
export function speakScript(script: string, rate = 0.95): Promise<void> {
  speechSynthesis.cancel()
  const voices = dutchVoices()
  const speakers: string[] = []
  const turns = scriptTurns(script)
  return new Promise((resolve) => {
    if (!turns.length) return resolve()
    turns.forEach((turn, i) => {
      if (!speakers.includes(turn.speaker)) speakers.push(turn.speaker)
      const n = speakers.indexOf(turn.speaker)
      const u = new SpeechSynthesisUtterance(turn.text)
      u.lang = 'nl-NL'
      u.rate = rate
      if (voices.length) u.voice = voices[n % voices.length]
      if (voices.length < 2) u.pitch = n % 2 ? 1.25 : 0.9
      if (i === turns.length - 1) {
        u.onend = () => resolve()
        u.onerror = () => resolve()
      }
      speechSynthesis.speak(u)
    })
  })
}

export function stopSpeaking(): void {
  if (speechSupported()) speechSynthesis.cancel()
}

export function hasDutchVoice(): boolean {
  return speechSupported() && dutchVoices().length > 0
}
