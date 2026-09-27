import { generateSpeech, type LlmSettings } from './llm'
import type { Gender } from './types'

let current: HTMLAudioElement | null = null
let cancelled = false

/** A short silence between turns, so speakers don't run into each other. */
const pause = () => new Promise((r) => setTimeout(r, 600))

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
export async function speakScript(script: string, rate = 0.85): Promise<void> {
  stopSpeaking()
  cancelled = false
  const voices = dutchVoices()
  const speakers: string[] = []
  const turns = scriptTurns(script)
  for (const [i, turn] of turns.entries()) {
    if (i) await pause()
    if (cancelled) return
    if (!speakers.includes(turn.speaker)) speakers.push(turn.speaker)
    const n = speakers.indexOf(turn.speaker)
    const u = new SpeechSynthesisUtterance(turn.text)
    u.lang = 'nl-NL'
    u.rate = rate
    if (voices.length) u.voice = voices[n % voices.length]
    if (voices.length < 2) u.pitch = n % 2 ? 1.25 : 0.9
    // One turn at a time: queueing them all lets voices from different speech engines overlap.
    await new Promise<void>((resolve) => {
      u.onend = u.onerror = () => resolve()
      speechSynthesis.speak(u)
    })
  }
}

export function stopSpeaking(): void {
  cancelled = true
  current?.pause()
  if (speechSupported()) speechSynthesis.cancel()
}

export function hasDutchVoice(): boolean {
  return speechSupported() && dutchVoices().length > 0
}

/** Two male and two female voices of the OpenAI speech API. */
export const AI_VOICES: Record<Gender, string[]> = { male: ['onyx', 'ash'], female: ['nova', 'shimmer'] }

/** Give every speaker a voice in order of appearance, matching gender when known, alternating otherwise. */
export function castVoices(turns: { speaker: string }[], genders: Record<string, Gender> = {}): Record<string, string> {
  const used: Record<Gender, number> = { male: 0, female: 0 }
  const cast: Record<string, string> = {}
  let n = 0
  for (const { speaker } of turns) {
    if (speaker in cast) continue
    const g = genders[speaker] ?? (n++ % 2 ? 'male' : 'female')
    cast[speaker] = AI_VOICES[g][used[g]++ % AI_VOICES[g].length]
  }
  return cast
}

// Audio per script, so "Listen again" does not pay twice.
const cache = new Map<string, Promise<string[]>>()

export interface VoiceSettings extends LlmSettings {
  voiceModel: string
}

/** Read a script aloud with AI voices, one voice per speaker. Rejects if the speech service fails. */
export async function playWithAiVoices(settings: VoiceSettings, script: string, genders?: Record<string, Gender>): Promise<void> {
  stopSpeaking()
  cancelled = false
  const turns = scriptTurns(script)
  const key = `${settings.voiceModel}|${script}`
  if (!cache.has(key)) {
    const cast = castVoices(turns, genders)
    const urls = Promise.all(
      turns.map((t) => generateSpeech(settings, settings.voiceModel, cast[t.speaker], t.text).then((b) => URL.createObjectURL(b))),
    )
    urls.catch(() => cache.delete(key))
    cache.set(key, urls)
  }
  const urls = await cache.get(key)!
  for (const [i, url] of urls.entries()) {
    if (i) await pause()
    if (cancelled) return
    await new Promise<void>((resolve) => {
      current = new Audio(url)
      current.onended = current.onerror = current.onpause = () => resolve()
      current.play().catch(() => resolve())
    })
  }
  current = null
}
