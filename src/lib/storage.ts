import type { FeedbackLanguage } from './coach'
import type { LlmSettings } from './llm'
import { PROVIDERS, type Provider } from './providers'
import type { Attempt, Level } from './types'
import type { WhisperModel } from './transcriber'

export interface Settings extends LlmSettings {
  provider: Provider
  level: Level
  feedbackLanguage: FeedbackLanguage
  whisperModel: WhisperModel
  /** How pictures for picture tasks are made: free drawings or AI images on the user's key. */
  pictureSource: 'drawings' | 'ai'
  imageModel: string
  /** Listening voices: natural AI voices on an OpenAI key, or the device's own voices. */
  voiceSource: 'ai' | 'device'
  voiceModel: string
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'browser',
  baseUrl: PROVIDERS.browser.baseUrl,
  apiKey: '',
  model: PROVIDERS.browser.model,
  level: 'B1',
  feedbackLanguage: 'en',
  whisperModel: 'small',
  pictureSource: 'drawings',
  imageModel: 'gpt-image-1',
  voiceSource: 'ai',
  voiceModel: 'gpt-4o-mini-tts',
}

const SETTINGS_KEY = 'openlingo.settings'
const HISTORY_KEY = 'openlingo.history'
const MAX_HISTORY = 500

// Storage can be unavailable (private mode, blocked site data); the app then works without saving.
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  const saved = read<Partial<Settings>>(SETTINGS_KEY) ?? {}
  // Settings saved before providers existed were always an OpenAI-compatible API.
  if (!saved.provider && saved.apiKey) {
    saved.provider = saved.baseUrl?.includes('api.openai.com') ? 'openai' : 'custom'
  }
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings)
}

export function loadHistory(): Attempt[] {
  const h = read<Attempt[]>(HISTORY_KEY)
  return Array.isArray(h) ? h : []
}

export function appendHistory(attempt: Attempt): Attempt[] {
  const history = [...loadHistory(), attempt].slice(-MAX_HISTORY)
  write(HISTORY_KEY, history)
  return history
}

export function clearHistory(): void {
  write(HISTORY_KEY, [])
}

/** AI voices and AI images exist only on OpenAI; every other provider uses the free device voices and drawings. */
export const aiVoices = (s: Settings) => s.provider === 'openai' && s.voiceSource === 'ai'
export const aiImages = (s: Settings) => s.provider === 'openai' && s.pictureSource === 'ai'
