import { useEffect, useState } from 'react'
import { Home } from './components/Home'
import { Icon } from './components/Icon'
import { ProgressView } from './components/ProgressView'
import { QuizPage } from './components/QuizPage'
import { SettingsView } from './components/SettingsView'
import { SpeakingPage } from './components/SpeakingPage'
import { WritingPage } from './components/WritingPage'
import { SKILL_INFO } from './lib/exams'
import { localModel } from './lib/localModel'
import { needsKey } from './lib/providers'
import { appendHistory, clearHistory, loadHistory, loadSettings, saveSettings, type Settings } from './lib/storage'
import { SKILLS, type Attempt, type Skill } from './lib/types'

type Route = '' | 'settings' | 'progress' | Skill

function readRoute(): Route {
  const r = window.location.hash.replace(/^#\/?/, '')
  return r === 'settings' || r === 'progress' || (SKILLS as readonly string[]).includes(r) ? (r as Route) : ''
}

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [history, setHistory] = useState<Attempt[]>(loadHistory)
  const [route, setRoute] = useState<Route>(readRoute)
  const [download, setDownload] = useState<number | null>(null)

  useEffect(() => localModel.subscribe(setDownload), [])

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function updateSettings(s: Settings) {
    setSettings(s)
    saveSettings(s)
  }

  const onAttempt = (a: Attempt) => setHistory(appendHistory(a))
  const page = { settings, history, onAttempt }
  const isSkill = route !== '' && route !== 'settings' && route !== 'progress'
  const title = isSkill ? `${SKILL_INFO[route].title} · ${settings.level}` : route === 'settings' ? 'Settings' : route === 'progress' ? 'Progress' : ''

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="logo" aria-hidden="true">
            NL
          </span>
          OpenLingo
        </a>
        <nav>
          <a href="#/progress" className={route === 'progress' ? 'active' : ''}>
            <Icon name="progress" size={18} /> <span>Progress</span>
          </a>
          <a href="#/settings" className={route === 'settings' ? 'active' : ''}>
            <Icon name="settings" size={18} /> <span>Settings</span>
          </a>
        </nav>
      </header>

      <main data-skill={isSkill ? route : undefined}>
        {title && (
          <div className="page-head">
            <a href="#/" className="back" aria-label="Back to home">
              ←
            </a>
            {isSkill && (
              <span className="icon" aria-hidden="true">
                <Icon name={route} />
              </span>
            )}
            <h2>{title}</h2>
          </div>
        )}

        {download !== null && (
          <div className="download" role="status">
            <span>Downloading the free coach to your device, once: {Math.round(download * 100)}%</span>
            <progress value={download} max={1} />
          </div>
        )}

        {isSkill && needsKey(settings) ? (
          <section className="card">
            <p>Add your API key in Settings first, or switch to the free coach that runs in your browser.</p>
            <a className="button primary" href="#/settings">
              Go to Settings
            </a>
          </section>
        ) : route === 'spreken' ? (
          <SpeakingPage {...page} />
        ) : route === 'schrijven' ? (
          <WritingPage {...page} />
        ) : route === 'lezen' || route === 'luisteren' || route === 'knm' ? (
          <QuizPage key={route} skill={route} {...page} />
        ) : route === 'settings' ? (
          <SettingsView settings={settings} onChange={updateSettings} />
        ) : route === 'progress' ? (
          <ProgressView
            history={history}
            onClear={() => {
              clearHistory()
              setHistory([])
            }}
          />
        ) : (
          <Home settings={settings} history={history} onLevel={(level) => updateSettings({ ...settings, level })} />
        )}
      </main>

      <footer className="muted small">
        Original practice material, not official exam content. Open source on{' '}
        <a href="https://github.com/PeterSlijkhuis/OpenLingo" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </footer>
    </div>
  )
}
