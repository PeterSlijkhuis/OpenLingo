import type { FeedbackLanguage } from './coach'
import type { LlmSettings } from './llm'
import type { Attempt, Level } from './types'
import type { WhisperModel } from './transcriber'

export interface Settings extends LlmSettings {
  level: Level
  feedbackLanguage: FeedbackLanguage
  whisperModel: WhisperModel
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  level: 'B1',
  feedbackLanguage: 'en',
  whisperModel: 'small',
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
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY) }
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
