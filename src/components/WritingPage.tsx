import { useState } from 'react'
import { coachWriting, countWords, generateWritingTask } from '../lib/coach'
import { SKILL_INFO } from '../lib/exams'
import { adapt } from '../lib/progress'
import type { Settings } from '../lib/storage'
import type { Attempt, Feedback, WritingTask } from '../lib/types'
import { FeedbackView } from './FeedbackView'

interface Props {
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

/** Writing practice: a generated task, a text box and written coaching. */
export function WritingPage({ settings, history, onAttempt }: Props) {
  const info = SKILL_INFO.schrijven
  const [task, setTask] = useState<WritingTask | null>(null)
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  async function next() {
    setError('')
    setFeedback(null)
    setText('')
    setBusy('Creating a writing task…')
    try {
      const t = await generateWritingTask(settings, settings.level, adapt(history, settings.level, 'schrijven'), recent)
      setTask(t)
      setRecent((r) => [...r, t.task].slice(-8))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  async function submit() {
    if (!task) return
    setError('')
    setBusy('Your coach is reading…')
    try {
      const fb = await coachWriting(settings, task, text, settings.feedbackLanguage)
      setFeedback(fb)
      onAttempt({
        skill: 'schrijven',
        taskId: task.id,
        level: task.level,
        topic: task.topic,
        at: Date.now(),
        scores: Object.fromEntries(fb.scores.map((s) => [s.criterion, s.score])) as Attempt['scores'],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const words = countWords(text)

  return (
    <div className="stack">
      {!task && (
        <section className="card intro">
          <p>{info.summary}</p>
          <p className="muted small">Exam format at {settings.level}: {info.format[settings.level]}</p>
          <button className="primary" disabled={!!busy} onClick={() => void next()}>
            {busy || 'Start'}
          </button>
        </section>
      )}

      {task && (
        <section className="card task">
          <p className="eyebrow">{task.topic}</p>
          <p className="situation" lang="nl">{task.situation}</p>
          <p className="question" lang="nl">{task.task}</p>
          <textarea
            lang="nl"
            spellCheck={false}
            rows={task.level === 'B2' ? 14 : 8}
            placeholder="Schrijf hier uw tekst…"
            value={text}
            disabled={!!feedback || !!busy}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row between">
            <span className={`small ${words < task.minWords || words > task.maxWords ? 'muted' : 'ok'}`}>
              {words} words · aim for {task.minWords}–{task.maxWords}
            </span>
            {!feedback && (
              <button className="primary" disabled={!!busy || words === 0} onClick={() => void submit()}>
                {busy || 'Get feedback'}
              </button>
            )}
          </div>
          <p className="muted small">Spell-check is off, like in the exam.</p>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {feedback && (
        <>
          <FeedbackView feedback={feedback} transcript={text} answerLabel="What you wrote" />
          <div className="actions">
            <button onClick={() => setFeedback(null)}>Improve my text</button>
            <button className="primary" disabled={!!busy} onClick={() => void next()}>
              {busy || 'Next task'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
