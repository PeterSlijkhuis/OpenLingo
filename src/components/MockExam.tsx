import { useRef, useState } from 'react'
import { coachAnswer, generateTask, passes, pictureKind } from '../lib/coach'
import { EXAMS, examSequence } from '../lib/exams'
import { adapt } from '../lib/progress'
import type { Settings } from '../lib/storage'
import { PICTURE_MODES, type Attempt, type Feedback, type SpeakingTask } from '../lib/types'
import { FeedbackView } from './FeedbackView'
import { toAttempt } from './Practice'
import { TaskRunner, type Answer } from './TaskRunner'

interface Props {
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

interface Result {
  task: SpeakingTask
  answer: Answer
  feedback: Promise<Feedback>
}

/** A full mock exam in the official order and timing; coaching is shown at the end. */
export function MockExam({ settings, history, onAttempt }: Props) {
  const spec = EXAMS[settings.level]
  const sequence = examSequence(settings.level)
  const [index, setIndex] = useState(-1)
  const [task, setTask] = useState<SpeakingTask | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [done, setDone] = useState<{ task: SpeakingTask; answer: Answer; feedback: Feedback | null; error?: string }[] | null>(null)
  const [error, setError] = useState('')
  const upcoming = useRef<Promise<SpeakingTask> | null>(null)
  const questions = useRef<string[]>([])

  function makeTask(i: number): Promise<SpeakingTask> {
    // The A2 exam is built on pictures and videos: every other question uses pictures.
    const picture = settings.level === 'A2' && i % 2 === 0 ? PICTURE_MODES[(i / 2) % PICTURE_MODES.length] : undefined
    const kind = picture ? pictureKind(settings.level, picture) : sequence[i]
    const p = generateTask(settings, settings.level, kind, adapt(history, settings.level), questions.current.slice(-12), undefined, picture)
    void p.then((t) => questions.current.push(t.question)).catch(() => {})
    return p
  }

  async function show(i: number, pending: Promise<SpeakingTask>) {
    setError('')
    setTask(null)
    setIndex(i)
    try {
      const t = await pending
      setTask(t)
      // Prepare the next situation while the candidate answers this one.
      upcoming.current = i + 1 < sequence.length ? makeTask(i + 1) : null
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function start() {
    questions.current = []
    setResults([])
    setDone(null)
    void show(0, makeTask(0))
  }

  async function handleAnswer(answer: Answer) {
    if (!task) return
    const feedback = coachAnswer(settings, task, answer, settings.feedbackLanguage)
    feedback.catch(() => {})
    const all = [...results, { task, answer, feedback }]
    setResults(all)
    if (index + 1 < sequence.length && upcoming.current) {
      void show(index + 1, upcoming.current)
      return
    }
    setTask(null)
    setIndex(-1)
    const settled = await Promise.allSettled(all.map((r) => r.feedback))
    const finished = all.map((r, i) => {
      const s = settled[i]
      return s.status === 'fulfilled'
        ? { task: r.task, answer: r.answer, feedback: s.value }
        : { task: r.task, answer: r.answer, feedback: null, error: String(s.reason) }
    })
    for (const f of finished) if (f.feedback) onAttempt(toAttempt(f.task, f.feedback))
    setDone(finished)
  }

  if (done) {
    const scored = done.filter((d) => d.feedback)
    const passed = scored.filter((d) => passes(d.feedback!.scores)).length
    return (
      <div className="stack">
        <section className="card">
          <h3>Mock exam finished</h3>
          <p>
            {passed} of {done.length} answers would pass at {settings.level}. The real exam is scored
            as a whole by two examiners, so treat this as an indication.
          </p>
          <button className="primary" onClick={start}>
            Take another mock exam
          </button>
        </section>
        {done.map((d, i) => (
          <details key={d.task.id} className="card">
            <summary>
              Question {i + 1}: <span lang="nl">{d.task.question}</span>
            </summary>
            {d.feedback ? (
              <FeedbackView feedback={d.feedback} transcript={d.answer.transcript} />
            ) : (
              <p className="error">Coaching failed for this answer: {d.error}</p>
            )}
          </details>
        ))}
      </div>
    )
  }

  if (index < 0) {
    return (
      <section className="card">
        <h3>{spec.name}</h3>
        <p>
          {sequence.length} questions in the official order and timing. You get feedback on every
          answer at the end. Practise the official format too with the{' '}
          <a href={spec.officialPracticeUrl} target="_blank" rel="noreferrer">
            official practice exams
          </a>
          .
        </p>
        {results.length > 0 && <p className="muted">Scoring your answers…</p>}
        <button className="primary" disabled={results.length > 0} onClick={start}>
          Start mock exam
        </button>
      </section>
    )
  }

  return (
    <div className="stack">
      {error && (
        <div className="row">
          <p className="error">{error}</p>
          <button onClick={() => void show(index, makeTask(index))}>Try again</button>
        </div>
      )}
      {!task && !error && <p className="muted">Preparing question {index + 1}…</p>}
      {task && (
        <TaskRunner
          key={task.id}
          task={task}
          whisperModel={settings.whisperModel}
          label={`Question ${index + 1} of ${sequence.length}`}
          onAnswer={(a) => void handleAnswer(a)}
        />
      )}
    </div>
  )
}
