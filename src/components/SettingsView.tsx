import { useState } from 'react'
import { EXAMS, LEVELS } from '../lib/exams'
import type { Settings } from '../lib/storage'
import { MODELS, transcriber, type WhisperModel } from '../lib/transcriber'
import type { Level } from '../lib/types'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
}

export function SettingsView({ settings, onChange }: Props) {
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })

  async function download() {
    setStatus('')
    setProgress(0)
    transcriber.onProgress = setProgress
    try {
      await transcriber.load(settings.whisperModel)
      setStatus('Speech recognition is ready.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      transcriber.onProgress = null
      setProgress(null)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>Exam</h3>
        <label>
          Level{' '}
          <select value={settings.level} onChange={(e) => set('level', e.target.value as Level)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {EXAMS[l].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Feedback language{' '}
          <select
            value={settings.feedbackLanguage}
            onChange={(e) => set('feedbackLanguage', e.target.value as Settings['feedbackLanguage'])}
          >
            <option value="en">English</option>
            <option value="nl">Nederlands</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h3>Speech recognition (Whisper, runs in your browser)</h3>
        <p className="muted">
          Your voice never leaves your device. The model downloads once and is then cached.
        </p>
        <label>
          Model{' '}
          <select value={settings.whisperModel} onChange={(e) => set('whisperModel', e.target.value as WhisperModel)}>
            {(Object.keys(MODELS) as WhisperModel[]).map((m) => (
              <option key={m} value={m}>
                {MODELS[m].label} ({MODELS[m].size})
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button disabled={progress !== null} onClick={() => void download()}>
            Download now
          </button>
          {progress !== null && <progress value={progress} max={1} />}
          {status && <span className="muted">{status}</span>}
        </div>
      </section>

      <section className="card">
        <h3>Coach (your own API key)</h3>
        <p className="muted">
          Situations and feedback come from a language model you choose. Your key is stored only in
          this browser and sent only to the address below. Any OpenAI-compatible API works.
        </p>
        <label>
          API key{' '}
          <input
            type="password"
            autoComplete="off"
            value={settings.apiKey}
            placeholder="sk-…"
            onChange={(e) => set('apiKey', e.target.value.trim())}
          />
        </label>
        <label>
          API address{' '}
          <input value={settings.baseUrl} onChange={(e) => set('baseUrl', e.target.value.trim())} />
        </label>
        <label>
          Model{' '}
          <input value={settings.model} onChange={(e) => set('model', e.target.value.trim())} />
        </label>
      </section>
    </div>
  )
}
