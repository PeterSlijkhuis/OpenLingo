import { useState } from 'react'
import { MockExam } from './components/MockExam'
import { Practice } from './components/Practice'
import { ProgressView } from './components/ProgressView'
import { SettingsView } from './components/SettingsView'
import { EXAMS } from './lib/exams'
import { appendHistory, clearHistory, loadHistory, loadSettings, saveSettings, type Settings } from './lib/storage'
import type { Attempt } from './lib/types'

type Tab = 'practice' | 'exam' | 'progress' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'exam', label: 'Mock exam' },
  { id: 'progress', label: 'Progress' },
  { id: 'settings', label: 'Settings' },
]

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [history, setHistory] = useState<Attempt[]>(loadHistory)
  const [tab, setTab] = useState<Tab>(() => (loadSettings().apiKey ? 'practice' : 'settings'))

  function updateSettings(s: Settings) {
    setSettings(s)
    saveSettings(s)
  }

  function addAttempt(a: Attempt) {
    setHistory(appendHistory(a))
  }

  const needsKey = !settings.apiKey && (tab === 'practice' || tab === 'exam')

  return (
    <div className="app">
      <header>
        <h1>OpenLingo</h1>
        <p className="muted">NT2 speaking practice · {EXAMS[settings.level].name}</p>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {needsKey ? (
          <section className="card">
            <p>Add an API key in Settings to generate situations and get coaching.</p>
            <button className="primary" onClick={() => setTab('settings')}>
              Go to Settings
            </button>
          </section>
        ) : tab === 'practice' ? (
          <Practice settings={settings} history={history} onAttempt={addAttempt} />
        ) : tab === 'exam' ? (
          <MockExam key={settings.level} settings={settings} history={history} onAttempt={addAttempt} />
        ) : tab === 'progress' ? (
          <ProgressView
            history={history}
            onClear={() => {
              clearHistory()
              setHistory([])
            }}
          />
        ) : (
          <SettingsView settings={settings} onChange={updateSettings} />
        )}
      </main>
      <footer className="muted">
        Original practice tasks, not official exam material. Official practice exams:{' '}
        <a href="https://oefenexamensnt2.nl" target="_blank" rel="noreferrer">Staatsexamen NT2</a> ·{' '}
        <a href="https://www.inburgeren.nl/examen-doen/oefenen.jsp" target="_blank" rel="noreferrer">
          Inburgering
        </a>
      </footer>
    </div>
  )
}
