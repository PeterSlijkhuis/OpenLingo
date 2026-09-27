import { passes } from '../lib/coach'
import type { Feedback } from '../lib/types'

const SCORE_LABEL = ['insufficient', 'almost', 'sufficient', 'good'] as const

export function FeedbackView({ feedback, transcript }: { feedback: Feedback; transcript: string }) {
  const pass = passes(feedback.scores)
  return (
    <section className="card feedback">
      <h3>
        <span className={pass ? 'badge pass' : 'badge fail'}>{pass ? 'Would pass' : 'Not yet'}</span>
      </h3>
      <p>{feedback.summary}</p>

      <h4>What you said</h4>
      <blockquote lang="nl">{transcript || <em>No speech recognised.</em>}</blockquote>

      <table className="scores">
        <tbody>
          {feedback.scores.map((s) => (
            <tr key={s.criterion}>
              <th>{s.criterion}</th>
              <td>
                <span className={`score s${s.score}`}>{SCORE_LABEL[s.score]}</span>
              </td>
              <td>{s.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {feedback.corrections.length > 0 && (
        <>
          <h4>Corrections</h4>
          <ul className="corrections">
            {feedback.corrections.map((c, i) => (
              <li key={i}>
                {c.said && (
                  <>
                    <s lang="nl">{c.said}</s> →{' '}
                  </>
                )}
                <strong lang="nl">{c.better}</strong>
                {c.why && <div className="muted">{c.why}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {feedback.coachTip && (
        <>
          <h4>Coach tip</h4>
          <p className="tip">{feedback.coachTip}</p>
        </>
      )}

      {feedback.modelAnswer && (
        <details>
          <summary>Model answer</summary>
          <p lang="nl">{feedback.modelAnswer}</p>
        </details>
      )}
    </section>
  )
}
