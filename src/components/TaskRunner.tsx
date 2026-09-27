import { useEffect, useRef, useState } from 'react'
import { blobToPcm, startRecording, type Recording } from '../lib/audio'
import { EXAMS, PREP_SECONDS } from '../lib/exams'
import { transcriber, type WhisperModel } from '../lib/transcriber'
import type { SpeakingTask } from '../lib/types'

export interface Answer {
  transcript: string
  seconds: number
  allowedSeconds: number
}

type Phase = 'reading' | 'recording' | 'transcribing' | 'error'

interface Props {
  task: SpeakingTask
  whisperModel: WhisperModel
  onAnswer: (answer: Answer) => void
  /** Label above the task, e.g. "Vraag 3 van 16". */
  label?: string
}

/** Shows a task, counts down the reading time, records the answer and transcribes it. */
export function TaskRunner({ task, whisperModel, onAnswer, label }: Props) {
  const prep = PREP_SECONDS[task.kind]
  const allowed = EXAMS[task.level].answerSeconds[task.kind]
  const [phase, setPhase] = useState<Phase>('reading')
  const [left, setLeft] = useState(prep)
  const [error, setError] = useState('')
  const recording = useRef<Recording | null>(null)
  const starting = useRef(false)
  const stopping = useRef(false)
  const lastRecording = useRef<{ blob: Blob; seconds: number } | null>(null)

  // Reset when a new task arrives.
  useEffect(() => {
    setPhase('reading')
    setLeft(prep)
    setError('')
    starting.current = false
    stopping.current = false
    lastRecording.current = null
    return () => recording.current?.cancel()
  }, [task.id, prep])

  // One-second countdown for reading and recording.
  useEffect(() => {
    if (phase !== 'reading' && phase !== 'recording') return
    if (left <= 0) {
      if (phase === 'reading') void begin()
      else void finish()
      return
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left])

  async function begin() {
    if (starting.current) return
    starting.current = true
    try {
      recording.current = await startRecording()
      setLeft(allowed)
      setPhase('recording')
    } catch {
      starting.current = false
      setError('Could not use the microphone. Allow microphone access and try again.')
      setPhase('error')
    }
  }

  async function finish() {
    if (stopping.current || !recording.current) return
    stopping.current = true
    setPhase('transcribing')
    try {
      const recorded = await recording.current.stop()
      recording.current = null
      lastRecording.current = recorded
      await transcribe(recorded)
    } catch (e) {
      fail(e)
    }
  }

  async function transcribe({ blob, seconds }: { blob: Blob; seconds: number }) {
    setPhase('transcribing')
    try {
      const pcm = await blobToPcm(blob)
      const transcript = await transcriber.transcribe(whisperModel, pcm)
      onAnswer({ transcript, seconds: Math.min(seconds, allowed), allowedSeconds: allowed })
    } catch (e) {
      fail(e)
    }
  }

  function fail(e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    setError(
      /fetch|network/i.test(message)
        ? 'Could not download the speech recognition model. Check your internet connection.'
        : message,
    )
    setPhase('error')
  }

  function restart() {
    starting.current = false
    stopping.current = false
    lastRecording.current = null
    setLeft(prep)
    setPhase('reading')
  }

  return (
    <section className="card task">
      <p className="eyebrow">
        {label ?? `${task.level} · ${kindLabel(task.kind)} · ${task.topic}`}
      </p>
      <p className="situation" lang="nl">{task.situation}</p>
      <p className="question" lang="nl">{task.question}</p>

      {phase === 'reading' && (
        <div className="row">
          <span className="timer">Recording starts in {left}s</span>
          <button onClick={() => void begin()}>Start speaking now</button>
        </div>
      )}
      {phase === 'recording' && (
        <div className="row">
          <span className="timer recording">● Speak now · {left}s left</span>
          <button onClick={() => void finish()}>I'm done</button>
        </div>
      )}
      {phase === 'transcribing' && <p className="muted">Transcribing your answer… The first time, this also downloads the speech model.</p>}
      {phase === 'error' && (
        <div className="row">
          <span className="error">{error}</span>
          {lastRecording.current && (
            <button onClick={() => void transcribe(lastRecording.current!)}>Retry transcription</button>
          )}
          <button onClick={restart}>Record again</button>
        </div>
      )}
    </section>
  )
}

export function kindLabel(kind: SpeakingTask['kind']): string {
  return kind === 'short' ? 'short answer' : kind === 'medium' ? 'medium answer' : 'long talk'
}
