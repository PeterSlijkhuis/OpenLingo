import { describe, expect, it } from 'vitest'
import { EXAMS, examSequence, kindsFor } from '../src/lib/exams'

describe('exam formats', () => {
  it('B1 follows Staatsexamen Programma I: 8 short then 8 medium', () => {
    const seq = examSequence('B1')
    expect(seq).toHaveLength(16)
    expect(seq.slice(0, 8).every((k) => k === 'short')).toBe(true)
    expect(seq.slice(8).every((k) => k === 'medium')).toBe(true)
    expect(EXAMS.B1.answerSeconds.short).toBe(20)
    expect(EXAMS.B1.answerSeconds.medium).toBe(30)
  })

  it('B2 follows Programma II: 4 short, 8 medium, 1 long of two minutes', () => {
    const seq = examSequence('B2')
    expect(seq.filter((k) => k === 'short')).toHaveLength(4)
    expect(seq.filter((k) => k === 'medium')).toHaveLength(8)
    expect(seq.at(-1)).toBe('long')
    expect(EXAMS.B2.answerSeconds.long).toBe(120)
  })

  it('A2 has 16 questions and only offers kinds that occur in its exam', () => {
    expect(examSequence('A2')).toHaveLength(16)
    expect(kindsFor('A2')).toEqual(['medium'])
    expect(kindsFor('B2')).toEqual(['short', 'medium', 'long'])
  })
})
