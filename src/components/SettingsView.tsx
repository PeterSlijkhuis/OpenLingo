import { useState } from 'react'
import type { Settings } from '../lib/storage'
import { MODELS, transcriber, type WhisperModel } from '../lib/transcriber'

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
      setStatus('Ready ✓')
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
        <h3>1 · Coach</h3>
        <p className="muted small">
          Exercises and feedback come from a language model you choose. Paste an API key from{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            OpenAI
          </a>{' '}
          or any OpenAI-compatible service. The key is stored only in this browser and only sent to
          the address below. A practice session usually costs a few cents.
        </p>
        <label>
          API key
          <input
            type="password"
            autoComplete="off"
            value={settings.apiKey}
            placeholder="sk-…"
            onChange={(e) => set('apiKey', e.target.value.trim())}
          />
        </label>
        <details>
          <summary className="small">Other provider or model</summary>
          <label>
            API address
            <input value={settings.baseUrl} onChange={(e) => set('baseUrl', e.target.value.trim())} />
          </label>
          <label>
            Model
            <input value={settings.model} onChange={(e) => set('model', e.target.value.trim())} />
          </label>
        </details>
        <label>
          Feedback language
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
        <h3>2 · Speech recognition</h3>
        <p className="muted small">
          For speaking practice, Whisper runs inside your browser. Your voice never leaves your
          device. The model downloads once and is then cached.
        </p>
        <label>
          Model
          <select value={settings.whisperModel} onChange={(e) => set('whisperModel', e.target.value as WhisperModel)}>
            {(Object.keys(MODELS) as WhisperModel[]).map((m) => (
              <option key={m} value={m}>
                {MODELS[m].label}, {MODELS[m].size}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button disabled={progress !== null} onClick={() => void download()}>
            Download now
          </button>
          {progress !== null && <progress value={progress} max={1} />}
          {status && <span className="small">{status}</span>}
        </div>
      </section>

      <section className="card">
        <h3>3 · Pictures</h3>
        <p className="muted small">
          Some speaking tasks show pictures to describe, compare or tell as a story, like the exam.
          Drawings are free. AI images look like real photos and cost about a cent each on your key,
          so a picture story costs about 4 cents.
        </p>
        <label>
          Pictures
          <select
            value={settings.pictureSource}
            onChange={(e) => set('pictureSource', e.target.value as Settings['pictureSource'])}
          >
            <option value="drawings">Simple drawings (free)</option>
            <option value="ai">AI images (uses your key)</option>
          </select>
        </label>
        {settings.pictureSource === 'ai' && (
          <label>
            Image model
            <input value={settings.imageModel} onChange={(e) => set('imageModel', e.target.value.trim())} />
          </label>
        )}
      </section>

      <a className="button primary block" href="#/">
        Done
      </a>
    </div>
  )
}
