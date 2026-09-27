import { useState } from 'react'
import { coachAnswer, generateTask, pictureKind } from '../lib/coach'
import { kindsFor } from '../lib/exams'
import { adapt } from '../lib/progress'
import type { Settings } from '../lib/storage'
import { PICTURE_MODES, type Attempt, type Feedback, type PictureMode, type SpeakingTask, type TaskKind } from '../lib/types'
import { FeedbackView } from './FeedbackView'
import { kindLabel, Pictures, TaskRunner, type Answer } from './TaskRunner'

interface Props {
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

type Choice = TaskKind | PictureMode

export const PICTURE_LABEL: Record<PictureMode, string> = {
  describe: 'Describe a picture',
  compare: 'Compare two pictures',
  story: 'Picture story (4 pictures)',
}

const isPicture = (c: Choice): c is PictureMode => (PICTURE_MODES as readonly string[]).includes(c)

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
  const choices: Choice[] = [...kinds, ...PICTURE_MODES]
  const [kind, setKind] = useState<Choice | 'mix'>('mix')
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
    try {
      const c = kind === 'mix' ? choices[Math.floor(Math.random() * choices.length)] : kind
      const picture = isPicture(c) ? c : undefined
      setBusy(picture ? 'Drawing the pictures…' : 'Creating a new situation…')
      const k = picture ? pictureKind(settings.level, picture) : (c as TaskKind)
      const t = await generateTask(settings, settings.level, k, adapt(history, settings.level), recent, undefined, picture)
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
          <select value={kind} onChange={(e) => setKind(e.target.value as Choice | 'mix')}>
            <option value="mix">Mixed, like the exam</option>
            {choices.map((c) => (
              <option key={c} value={c}>
                {isPicture(c) ? PICTURE_LABEL[c] : kindLabel(c)}
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
          <Pictures task={task} />
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
