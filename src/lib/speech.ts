import { generateSpeech, type LlmSettings } from './llm'
import type { Gender } from './types'

let audio: AudioContext | null = null
let cancelled = false

/** A short silence between turns, so speakers don't run into each other. */
const GAP_SECONDS = 0.6
const pause = () => new Promise((r) => setTimeout(r, GAP_SECONDS * 1000))

const SPEAKER = /(^|[.!?…]["”']?\s+)([A-ZÀ-Ý][\p{L}'-]{0,20}(?: [A-ZÀ-Ý][\p{L}'-]{1,20})?):\s+/gu

/**
 * Split a listening script into turns. "Naam: tekst" starts a new speaker, also when the model
 * wrote several turns on one line. A line without a name has no speaker (a narrator).
 */
export function scriptTurns(script: string): { speaker: string; text: string }[] {
  return script.split('\n').flatMap((line) => {
    const turns = [{ speaker: '', text: line }]
    for (const m of line.matchAll(SPEAKER)) {
      const last = turns[turns.length - 1]
      last.text = line.slice(line.length - last.text.length, m.index + m[1].length)
      turns.push({ speaker: m[2], text: line.slice(m.index + m[0].length) })
    }
    return turns.map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text)
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
  void audio?.close()
  audio = null
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
const cache = new Map<string, Promise<Blob[]>>()

export interface VoiceSettings extends LlmSettings {
  voiceModel: string
}

/**
 * Read a script aloud with AI voices, one voice per speaker. All turns go on one Web Audio
 * timeline with a gap between them, so they can never overlap. Rejects if the speech service fails.
 */
export async function playWithAiVoices(settings: VoiceSettings, script: string, genders?: Record<string, Gender>): Promise<void> {
  stopSpeaking()
  cancelled = false
  // Created inside the click, before any await, so mobile browsers allow the sound.
  const ctx = new AudioContext()
  audio = ctx
  const turns = scriptTurns(script)
  const key = `${settings.voiceModel}|${script}`
  if (!cache.has(key)) {
    const cast = castVoices(turns, genders)
    const clips = Promise.all(turns.map((t) => generateSpeech(settings, settings.voiceModel, cast[t.speaker], t.text)))
    clips.catch(() => cache.delete(key))
    cache.set(key, clips)
  }
  try {
    const clips = await cache.get(key)!
    const buffers = await Promise.all(clips.map(async (c) => ctx.decodeAudioData(await c.arrayBuffer())))
    if (cancelled) return
    let t = ctx.currentTime + 0.1
    for (const buffer of buffers) {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(t)
      t += buffer.duration + GAP_SECONDS
    }
    await new Promise<void>((resolve) => {
      const check = () => (cancelled || ctx.currentTime >= t - GAP_SECONDS ? resolve() : setTimeout(check, 200))
      check()
    })
  } finally {
    if (audio === ctx) stopSpeaking()
  }
}
