import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appendHistory, DEFAULT_SETTINGS, loadHistory, loadSettings, saveSettings } from '../src/lib/storage'
import type { Attempt } from '../src/lib/types'

const attempt: Attempt = {
  taskId: 't',
  level: 'B1',
  kind: 'short',
  topic: 'werk',
  at: 1,
  scores: { inhoud: 2, woordenschat: 2, grammatica: 2, samenhang: 2 },
}

describe('storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
  })

  it('falls back to defaults and merges saved settings', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    saveSettings({ ...DEFAULT_SETTINGS, level: 'B2', apiKey: 'k' })
    expect(loadSettings()).toMatchObject({ level: 'B2', apiKey: 'k', model: DEFAULT_SETTINGS.model })
  })

  it('appends to history', () => {
    appendHistory(attempt)
    expect(appendHistory({ ...attempt, taskId: 'u' }).map((a) => a.taskId)).toEqual(['t', 'u'])
    expect(loadHistory()).toHaveLength(2)
  })

  it('keeps working when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(appendHistory(attempt)).toEqual([attempt])
  })
})
