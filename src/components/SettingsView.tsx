import { useEffect, useState } from 'react'
import { localModel } from '../lib/localModel'
import { PROVIDERS, type Provider } from '../lib/providers'
import type { Settings } from '../lib/storage'
import { MODELS, transcriber, type WhisperModel } from '../lib/transcriber'

interface Props {
  settings: Settings
  onChange: (settings: Settings) => void
}

function Download({ label, run, progress }: { label: string; run: () => Promise<unknown>; progress: number | null }) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  async function go() {
    setStatus('')
    setBusy(true)
    try {
      await run()
      setStatus('Ready ✓')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="row">
      <button disabled={busy} onClick={() => void go()}>
        {label}
      </button>
      {busy && progress !== null && <progress value={progress} max={1} />}
      {status && <span className="small">{status}</span>}
    </div>
  )
}

export function SettingsView({ settings, onChange }: Props) {
  const [whisperProgress, setWhisperProgress] = useState<number | null>(null)
  const [gemmaProgress, setGemmaProgress] = useState<number | null>(null)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value })
  const info = PROVIDERS[settings.provider]
  const openai = settings.provider === 'openai'

  useEffect(() => localModel.subscribe(setGemmaProgress), [])

  function choose(provider: Provider) {
    const p = PROVIDERS[provider]
    // A key belongs to one service, so switching clears it.
    onChange({ ...settings, provider, baseUrl: p.baseUrl, model: p.model, apiKey: provider === settings.provider ? settings.apiKey : '' })
  }

  async function loadWhisper() {
    transcriber.onProgress = setWhisperProgress
    try {
      await transcriber.load(settings.whisperModel)
    } finally {
      transcriber.onProgress = null
      setWhisperProgress(null)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h3>1 · Coach</h3>
        <p className="muted small">The model that writes your exercises and gives feedback.</p>
        <div className="choices" role="radiogroup" aria-label="Coach">
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={p === settings.provider}
              className={`choice ${p === settings.provider ? 'active' : ''}`}
              onClick={() => choose(p)}
            >
              <span className="choice-title">
                {PROVIDERS[p].label}
                {PROVIDERS[p].free && <span className="tag">Free</span>}
              </span>
            </button>
          ))}
        </div>
        <p className="small note">{info.note}</p>

        {settings.provider === 'browser' ? (
          <Download label="Download the coach now (about 3 GB)" run={() => localModel.load()} progress={gemmaProgress} />
        ) : (
          <>
            <label>
              {settings.provider === 'custom' ? 'API key (if your server needs one)' : 'API key'}
              <input
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                placeholder="Paste your key"
                onChange={(e) => set('apiKey', e.target.value.trim())}
              />
            </label>
            {info.keyUrl && (
              <p className="small">
                <a href={info.keyUrl} target="_blank" rel="noreferrer">
                  Get a {info.free ? 'free ' : ''}key ↗
                </a>{' '}
                <span className="muted">The key stays in this browser and is only sent to {new URL(info.baseUrl).host}.</span>
              </p>
            )}
            <details>
              <summary className="small">Address and model</summary>
              <label>
                API address
                <input value={settings.baseUrl} onChange={(e) => set('baseUrl', e.target.value.trim())} />
              </label>
              <label>
                Model
                <input value={settings.model} onChange={(e) => set('model', e.target.value.trim())} />
              </label>
            </details>
          </>
        )}

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
          Free. Whisper runs inside your browser, so your voice never leaves your device. The model
          downloads once and is then cached.
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
        <Download label="Download now" run={loadWhisper} progress={whisperProgress} />
      </section>

      <section className="card">
        <h3>3 · Listening voices</h3>
        {openai ? (
          <>
            <p className="muted small">
              AI voices sound natural: two male and two female voices, about 1 to 2 cents per
              fragment. Device voices are free.
            </p>
            <label>
              Voices
              <select value={settings.voiceSource} onChange={(e) => set('voiceSource', e.target.value as Settings['voiceSource'])}>
                <option value="ai">AI voices (uses your key)</option>
                <option value="device">This device's voices (free)</option>
              </select>
            </label>
            {settings.voiceSource === 'ai' && (
              <label>
                Speech model
                <input value={settings.voiceModel} onChange={(e) => set('voiceModel', e.target.value.trim())} />
              </label>
            )}
          </>
        ) : (
          <p className="muted small">
            Free: fragments are read by your device's own Dutch voices. For the best sound, install
            a Dutch voice in your system's speech settings. Natural AI voices are available with an
            OpenAI key.
          </p>
        )}
      </section>

      <section className="card">
        <h3>4 · Pictures</h3>
        {openai ? (
          <>
            <p className="muted small">
              Picture tasks come with simple drawings for free. AI images look like photos and cost
              about a cent each.
            </p>
            <label>
              Pictures
              <select value={settings.pictureSource} onChange={(e) => set('pictureSource', e.target.value as Settings['pictureSource'])}>
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
          </>
        ) : (
          <p className="muted small">
            Free: picture tasks come with simple drawings made by the coach. Photo-like AI images are
            available with an OpenAI key.
          </p>
        )}
      </section>

      <a className="button primary block" href="#/">
        Done
      </a>
    </div>
  )
}
