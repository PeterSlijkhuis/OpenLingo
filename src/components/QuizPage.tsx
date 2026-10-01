import { useEffect, useState } from 'react'
import { generateQuiz, scoreQuiz } from '../lib/coach'
import { SKILL_INFO } from '../lib/exams'
import { adapt } from '../lib/progress'
import { hasDutchVoice, playWithAiVoices, speakScript, speechSupported, stopSpeaking } from '../lib/speech'
import { aiVoices, type Settings } from '../lib/storage'
import type { Attempt, Quiz, QuizSkill } from '../lib/types'

interface Props {
  skill: QuizSkill
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

/** Reading, listening and KNM practice: generated multiple-choice exercises with explanations. */
export function QuizPage({ skill, settings, history, onAttempt }: Props) {
  const info = SKILL_INFO[skill]
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [plays, setPlays] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')

  useEffect(() => stopSpeaking, [])

  async function next() {
    stopSpeaking()
    setError('')
    setBusy(true)
    try {
      const q = await generateQuiz(
        settings,
        skill,
        settings.level,
        adapt(history, settings.level, skill),
        recent,
        settings.feedbackLanguage,
      )
      setQuiz(q)
      setAnswers(q.questions.map(() => null))
      setChecked(false)
      setPlays(0)
      setRecent((r) => [...r, q.title].slice(-8))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function play() {
    if (!quiz) return
    setPlays((n) => n + 1)
    setPlaying(true)
    try {
      if (aiVoices(settings)) await playWithAiVoices(settings, quiz.text, quiz.speakers)
      else await speakScript(quiz.text)
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e)
      // Without a Dutch device voice the fallback reads Dutch with an English voice: worse than nothing.
      if (hasDutchVoice()) {
        setVoiceNote(`AI voices failed, using your device's Dutch voice instead. ${why}`)
        await speakScript(quiz.text)
      } else {
        setVoiceNote(`AI voices failed, so the fragment could not be played. ${why}`)
      }
    }
    setPlaying(false)
  }

  function check() {
    if (!quiz) return
    stopSpeaking()
    setChecked(true)
    onAttempt({
      skill,
      taskId: quiz.id,
      level: quiz.level,
      topic: quiz.topic,
      at: Date.now(),
      correct: scoreQuiz(quiz, answers),
      total: quiz.questions.length,
    })
  }

  const allAnswered = answers.every((a) => a !== null)
  const score = quiz ? scoreQuiz(quiz, answers) : 0

  return (
    <div className="stack">
      {!quiz && (
        <section className="card intro">
          <p>{info.summary}</p>
          <p className="muted small">Exam format at {settings.level}: {info.format[settings.level]}</p>
          {skill === 'luisteren' && !aiVoices(settings) && speechSupported() && !hasDutchVoice() && (
            <p className="notice">
              Your device has no Dutch voice installed, so fragments may sound English. Add a Dutch
              voice in your system's speech settings for the best result.
            </p>
          )}
          {skill === 'luisteren' && !aiVoices(settings) && !speechSupported() && (
            <p className="notice">This browser cannot read text aloud. Try Chrome, Edge or Safari.</p>
          )}
          <button className="primary" disabled={busy} onClick={() => void next()}>
            {busy ? 'Creating an exercise…' : 'Start'}
          </button>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      {quiz && (
        <>
          <section className="card">
            <p className="eyebrow">{quiz.topic}</p>
            <h2 lang="nl">{quiz.title}</h2>
            {skill === 'lezen' && (
              <div className="reading" lang="nl">
                {quiz.text.split(/\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
            {skill === 'luisteren' && (
              <div className="row">
                <button className="primary" disabled={playing} onClick={() => void play()}>
                  {playing ? 'Playing…' : plays === 0 ? '▶ Listen' : '▶ Listen again'}
                </button>
                {playing && (
                  <button onClick={stopSpeaking}>
                    Stop
                  </button>
                )}
                <span className="muted small">
                  {plays === 0
                    ? 'In the exam you hear each fragment once.'
                    : `Played ${plays}×. The text appears after you check your answers.`}
                </span>
              </div>
            )}
            {skill === 'luisteren' && voiceNote && <p className="notice small">{voiceNote}</p>}
          </section>

          {quiz.questions.map((q, i) => {
            const chosen = answers[i]
            return (
              <section key={i} className="card question-card">
                <p className="q" lang="nl">
                  <span className="qnum">{i + 1}</span> {q.question}
                </p>
                <div className="options">
                  {q.options.map((opt, j) => {
                    const state = !checked
                      ? chosen === j
                        ? 'selected'
                        : ''
                      : j === q.answer
                        ? 'right'
                        : chosen === j
                          ? 'wrong'
                          : ''
                    return (
                      <button
                        key={j}
                        className={`option ${state}`}
                        disabled={checked}
                        onClick={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                        lang="nl"
                      >
                        <span className="letter">{String.fromCharCode(65 + j)}</span>
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {checked && <p className="explanation">{q.explanation}</p>}
              </section>
            )
          })}

          {!checked ? (
            <div className="actions">
              <button className="primary" disabled={!allAnswered} onClick={check}>
                Check answers
              </button>
              {!allAnswered && <span className="muted small">Answer every question first.</span>}
            </div>
          ) : (
            <>
              <section className="card result">
                <p className="big">
                  {score} / {quiz.questions.length}
                </p>
                <p className="muted">
                  {score / quiz.questions.length >= 0.7
                    ? 'Good. That is around the pass level.'
                    : 'Not there yet. Read the explanations and try another one.'}
                </p>
              </section>
              {skill === 'luisteren' && (
                <details className="card">
                  <summary>Show the text you heard</summary>
                  <div className="reading" lang="nl">
                    {quiz.text.split(/\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </details>
              )}
              <div className="actions">
                <button className="primary" disabled={busy} onClick={() => void next()}>
                  {busy ? 'Creating…' : 'Next exercise'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
