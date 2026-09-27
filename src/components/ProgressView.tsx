import { LEVELS } from '../lib/exams'
import { criterionAverages } from '../lib/progress'
import { CRITERIA, type Attempt } from '../lib/types'

interface Props {
  history: Attempt[]
  onClear: () => void
}

export function ProgressView({ history, onClear }: Props) {
  const levels = LEVELS.filter((l) => history.some((a) => a.level === l))
  if (!levels.length) {
    return (
      <section className="card">
        <p>No answers yet. Your scores appear here after practising.</p>
      </section>
    )
  }
  return (
    <div className="stack">
      {levels.map((level) => {
        const attempts = history.filter((a) => a.level === level)
        const all = criterionAverages(attempts)
        const recent = criterionAverages(attempts.slice(-10))
        return (
          <section key={level} className="card">
            <h3>
              {level} · {attempts.length} answers
            </h3>
            <table className="scores">
              <thead>
                <tr>
                  <th />
                  <th>All time</th>
                  <th>Last 10</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((c) => (
                  <tr key={c}>
                    <th>{c}</th>
                    <td>{all[c].toFixed(1)} / 3</td>
                    <td>{recent[c].toFixed(1)} / 3</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">2 or more on every criterion is roughly a pass.</p>
          </section>
        )
      })}
      <button onClick={onClear}>Clear history</button>
    </div>
  )
}
