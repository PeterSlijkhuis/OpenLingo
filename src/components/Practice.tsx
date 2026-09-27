import { useState } from 'react'
import { coachAnswer, generateTask } from '../lib/coach'
import { kindsFor } from '../lib/exams'
import { adapt } from '../lib/progress'
import type { Settings } from '../lib/storage'
import type { Attempt, Feedback, SpeakingTask, TaskKind } from '../lib/types'
import { FeedbackView } from './FeedbackView'
import { kindLabel, TaskRunner, type Answer } from './TaskRunner'

interface Props {
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

export function toAttempt(task: SpeakingTask, feedback: Feedback): Attempt {
  return {
    skill: 'spreken',
    taskId: task.id,
    level: task.level,
    kind: task.kind,
    topic: task.topic,
    at: Date.now(),
    scores: Object.fromEntries(feedback.scores.map((s) => [s.criterion, s.score])) as Attempt['scores'],
  }
}

/** Endless practice: a new situation adapted to recent results, coaching after every answer. */
export function Practice({ settings, history, onAttempt }: Props) {
  const kinds = kindsFor(settings.level)
  const [kind, setKind] = useState<TaskKind | 'mix'>('mix')
  const [task, setTask] = useState<SpeakingTask | null>(null)
  const [round, setRound] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  async function next() {
    setError('')
    setAnswer(null)
    setFeedback(null)
    setBusy('Creating a new situation…')
    try {
      const k = kind === 'mix' ? kinds[Math.floor(Math.random() * kinds.length)] : kind
      const t = await generateTask(settings, settings.level, k, adapt(history, settings.level), recent)
      setTask(t)
      setRecent((r) => [...r, t.question].slice(-8))
      setRound((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  function retry() {
    setAnswer(null)
    setFeedback(null)
    setRound((n) => n + 1)
  }

  async function handleAnswer(a: Answer) {
    if (!task) return
    setAnswer(a)
    setBusy('Your coach is listening back…')
    try {
      const fb = await coachAnswer(settings, task, a, settings.feedbackLanguage)
      setFeedback(fb)
      onAttempt(toAttempt(task, fb))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <label>
          Task type{' '}
          <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind | 'mix')}>
            <option value="mix">Mixed, like the exam</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={!!busy} onClick={() => void next()}>
          {task ? 'New situation' : 'Start practising'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {task && !answer && (
        <TaskRunner key={`${task.id}-${round}`} task={task} whisperModel={settings.whisperModel} onAnswer={(a) => void handleAnswer(a)} />
      )}

      {task && answer && (
        <section className="card task">
          <p className="eyebrow">{`${task.level} · ${kindLabel(task.kind)} · ${task.topic}`}</p>
          <p className="situation" lang="nl">{task.situation}</p>
          <p className="question" lang="nl">{task.question}</p>
        </section>
      )}

      {busy && <p className="muted">{busy}</p>}

      {feedback && answer && (
        <>
          <FeedbackView feedback={feedback} transcript={answer.transcript} />
          <div className="row">
            <button onClick={retry}>Try this one again</button>
            <button className="primary" onClick={() => void next()}>
              Next situation
            </button>
          </div>
        </>
      )}
      {!feedback && answer && error && (
        <button onClick={() => void handleAnswer(answer)}>Ask the coach again</button>
      )}
    </div>
  )
}
