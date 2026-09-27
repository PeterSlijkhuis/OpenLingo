import { LEVELS, OFFICIAL_PRACTICE, SKILL_INFO } from '../lib/exams'
import { performance, skillOf } from '../lib/progress'
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

function stat(history: Attempt[], level: Level, skill: Skill): string {
  const mine = history.filter((a) => a.level === level && skillOf(a) === skill)
  if (!mine.length) return 'Not started'
  const recent = mine.slice(-10)
  const avg = recent.reduce((n, a) => n + performance(a), 0) / recent.length
  return `${mine.length} done · ${Math.round((avg / 3) * 100)}% recently`
}

export function Home({ settings, history, onLevel }: Props) {
  const level = settings.level
  return (
    <div className="stack">
      <section className="hero">
        <h1>Oefen voor je NT2-examen</h1>
        <p className="muted">
          Unlimited practice for every part of the Dutch exam, with a coach that adapts to you.
        </p>
        <div className="segmented" role="radiogroup" aria-label="Exam level">
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
      </section>

      {!settings.apiKey && (
        <a className="card setup" href="#/settings">
          <strong>Set up in one minute →</strong>
          <span className="muted">
            Add an API key so the coach can create exercises and give feedback. It stays in this
            browser.
          </span>
        </a>
      )}

      <div className="grid">
        {SKILLS.map((skill) => {
          const info = SKILL_INFO[skill]
          return (
            <a key={skill} className="card skill" href={`#/${skill}`}>
              <span className="icon" aria-hidden="true">
                {info.icon}
              </span>
              <div>
                <h3>
                  {info.title} <span className="muted">· {info.subtitle}</span>
                </h3>
                <p className="small">{info.format[level]}</p>
                <p className="muted small">{stat(history, level, skill)}</p>
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
