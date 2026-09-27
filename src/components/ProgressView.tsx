import { LEVELS, SKILL_INFO } from '../lib/exams'
import { criterionAverages, quizAccuracy, skillOf } from '../lib/progress'
import { CRITERIA, SKILLS, type Attempt } from '../lib/types'

interface Props {
  history: Attempt[]
  onClear: () => void
}

export function ProgressView({ history, onClear }: Props) {
  const levels = LEVELS.filter((l) => history.some((a) => a.level === l))
  if (!levels.length) {
    return (
      <section className="card">
        <p>No results yet. Your scores appear here after practising.</p>
      </section>
    )
  }
  return (
    <div className="stack">
      {levels.map((level) => (
        <section key={level} className="card">
          <h3>Level {level}</h3>
          <div className="progress-list">
            {SKILLS.map((skill) => {
              const mine = history.filter((a) => a.level === level && skillOf(a) === skill)
              if (!mine.length) return null
              const info = SKILL_INFO[skill]
              const recent = mine.slice(-10)
              return (
                <div key={skill} className="progress-row">
                  <div className="progress-title">
                    <span aria-hidden="true">{info.icon}</span> {info.title}
                    <span className="muted small"> · {mine.length} done</span>
                  </div>
                  {mine.some((a) => a.scores) ? (
                    <div className="chips">
                      {CRITERIA.map((c) => {
                        const avg = criterionAverages(recent)[c]
                        return (
                          <span key={c} className={`chip ${avg >= 2 ? 'good' : avg >= 1 ? 'mid' : 'low'}`}>
                            {c} {avg.toFixed(1)}/3
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="chips">
                      <span className={`chip ${quizAccuracy(recent) >= 0.7 ? 'good' : 'mid'}`}>
                        {Math.round(quizAccuracy(recent) * 100)}% correct recently
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="muted small">Recent = last 10 attempts. 2 or more on every criterion, or 70% correct, is roughly a pass.</p>
      <button onClick={onClear}>Clear history</button>
    </div>
  )
}
