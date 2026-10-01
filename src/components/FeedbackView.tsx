import { passes } from '../lib/coach'
import type { Feedback } from '../lib/types'

const SCORE_LABEL = ['Insufficient', 'Almost', 'Sufficient', 'Good'] as const

export function FeedbackView({
  feedback,
  transcript,
  answerLabel = 'What you said',
}: {
  feedback: Feedback
  transcript: string
  answerLabel?: string
}) {
  const pass = passes(feedback.scores)
  return (
    <section className={`card feedback ${pass ? 'passed' : ''}`}>
      <div className="verdict">
        <span className={pass ? 'badge pass' : 'badge fail'}>{pass ? 'Would pass' : 'Not yet, keep going'}</span>
        <p>{feedback.summary}</p>
      </div>

      <div className="criteria">
        {feedback.scores.map((s) => (
          <div key={s.criterion} className="criterion">
            <div className="criterion-head">
              <span className="criterion-name">{s.criterion}</span>
              <span className={`score s${s.score}`}>{SCORE_LABEL[s.score]}</span>
            </div>
            <div className="meter" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < s.score ? `on s${s.score}` : ''} />
              ))}
            </div>
            <p className="small">{s.comment}</p>
          </div>
        ))}
      </div>

      <h4>{answerLabel}</h4>
      <blockquote lang="nl">{transcript || <em>Nothing recognised.</em>}</blockquote>

      {feedback.corrections.length > 0 && (
        <>
          <h4>Corrections</h4>
          <ul className="corrections">
            {feedback.corrections.map((c, i) => (
              <li key={i}>
                {c.said && (
                  <div className="said" lang="nl">
                    {c.said}
                  </div>
                )}
                <div className="better" lang="nl">
                  {c.better}
                </div>
                {c.why && <div className="muted small">{c.why}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {feedback.coachTip && (
        <div className="tip">
          <strong>Coach tip</strong>
          <p>{feedback.coachTip}</p>
        </div>
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
