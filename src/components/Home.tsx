import type { CSSProperties } from 'react'
import { LEVELS, OFFICIAL_PRACTICE, SKILL_INFO } from '../lib/exams'
import { Icon } from './Icon'
import { needsKey } from '../lib/providers'
import { doneToday, performance, skillOf, streak } from '../lib/progress'
import type { Settings } from '../lib/storage'
import { SKILLS, type Attempt, type Level, type Skill } from '../lib/types'

interface Props {
  settings: Settings
  history: Attempt[]
  onLevel: (level: Level) => void
}

const LEVEL_NOTE: Record<Level, string> = {
  A2: 'Inburgering',
  B1: 'Staatsexamen I',
  B2: 'Staatsexamen II',
}

const DAILY_GOAL = 3

// Dutch sayings about learning, one per day.
const SAYINGS: [string, string][] = [
  ['Oefening baart kunst.', 'Practice makes perfect.'],
  ['Al doende leert men.', 'You learn by doing.'],
  ['De aanhouder wint.', 'Whoever keeps going, wins.'],
  ['Wie niet waagt, die niet wint.', 'Nothing ventured, nothing gained.'],
  ['Rome is niet in één dag gebouwd.', 'Rome was not built in a day.'],
  ['Langzaam aan, dan breekt het lijntje niet.', 'Slow and steady keeps the line from breaking.'],
  ['Van fouten leer je.', 'You learn from mistakes.'],
]

function recentScore(history: Attempt[], level: Level, skill: Skill): { done: number; pct: number } {
  const mine = history.filter((a) => a.level === level && skillOf(a) === skill)
  const recent = mine.slice(-10)
  const avg = recent.length ? recent.reduce((n, a) => n + performance(a), 0) / recent.length : 0
  return { done: mine.length, pct: Math.round((avg / 3) * 100) }
}

export function Home({ settings, history, onLevel }: Props) {
  const level = settings.level
  const today = doneToday(history)
  const days = streak(history)
  const [nl, en] = SAYINGS[Math.floor(Date.now() / 86_400_000) % SAYINGS.length]
  const goal = Math.min(today / DAILY_GOAL, 1)

  return (
    <div className="stack home">
      <section className="hero">
        <div className="hero-text">
          <p className="kicker">NT2 · {LEVEL_NOTE[level]}</p>
          <h1>
            Oefen voor je <span className="accent">NT2-examen</span>
          </h1>
          <p className="saying" lang="nl">
            “{nl}” <span>{en}</span>
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{days}</span>
            <span className="stat-label">{days === 1 ? 'day' : 'days'} in a row</span>
          </div>
          <div className="stat">
            <span className="ring" style={{ '--p': goal } as CSSProperties} aria-hidden="true" />
            <span className="stat-value">
              {Math.min(today, DAILY_GOAL)}/{DAILY_GOAL}
            </span>
            <span className="stat-label">{today >= DAILY_GOAL ? 'daily goal reached' : 'daily goal'}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{history.length}</span>
            <span className="stat-label">exercises done</span>
          </div>
        </div>
      </section>

      <div className="segmented levels" role="radiogroup" aria-label="Exam level">
        {LEVELS.map((l) => (
          <button
            key={l}
            role="radio"
            aria-checked={l === level}
            className={l === level ? 'active' : ''}
            onClick={() => onLevel(l)}
          >
            <strong>{l}</strong>
            <span>{LEVEL_NOTE[l]}</span>
          </button>
        ))}
      </div>

      {needsKey(settings) && (
        <a className="card setup" href="#/settings">
          <strong>Add your API key →</strong>
          <span className="muted">
            Your coach needs a key, or switch to the free coach that runs in your browser.
          </span>
        </a>
      )}

      <div className="grid skills">
        {SKILLS.map((skill) => {
          const info = SKILL_INFO[skill]
          const { done, pct } = recentScore(history, level, skill)
          return (
            <a key={skill} className="card skill" data-skill={skill} href={`#/${skill}`}>
              <span className="icon" aria-hidden="true">
                <Icon name={skill} size={24} />
              </span>
              <div className="skill-body">
                <h3>
                  {info.title} <span className="muted">{info.subtitle}</span>
                </h3>
                <p className="small muted">{info.format[level]}</p>
                <div className="skill-foot">
                  <div className="bar" aria-hidden="true">
                    <span style={{ width: `${done ? pct : 0}%` }} />
                  </div>
                  <span className="small">{done ? `${pct}% · ${done} done` : 'Start →'}</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      <section className="card links">
        <h3>Official practice exams</h3>
        <p className="small muted">
          Everything here is original practice material. Also practise with the real formats:
        </p>
        <div className="row">
          <a className="button" href={OFFICIAL_PRACTICE.staatsexamen} target="_blank" rel="noreferrer">
            Staatsexamen NT2 ↗
          </a>
          <a className="button" href={OFFICIAL_PRACTICE.inburgering} target="_blank" rel="noreferrer">
            Inburgering (DUO) ↗
          </a>
        </div>
      </section>
    </div>
  )
}
