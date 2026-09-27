import { useState } from 'react'
import { SKILL_INFO } from '../lib/exams'
import type { Settings } from '../lib/storage'
import type { Attempt } from '../lib/types'
import { MockExam } from './MockExam'
import { Practice } from './Practice'

interface Props {
  settings: Settings
  history: Attempt[]
  onAttempt: (attempt: Attempt) => void
}

export function SpeakingPage(props: Props) {
  const [mode, setMode] = useState<'practice' | 'exam'>('practice')
  return (
    <div className="stack">
      <p className="muted small">{SKILL_INFO.spreken.format[props.settings.level]}</p>
      <div className="segmented small" role="tablist">
        <button role="tab" aria-selected={mode === 'practice'} className={mode === 'practice' ? 'active' : ''} onClick={() => setMode('practice')}>
          Practice
        </button>
        <button role="tab" aria-selected={mode === 'exam'} className={mode === 'exam' ? 'active' : ''} onClick={() => setMode('exam')}>
          Mock exam
        </button>
      </div>
      {mode === 'practice' ? <Practice {...props} /> : <MockExam key={props.settings.level} {...props} />}
    </div>
  )
}
