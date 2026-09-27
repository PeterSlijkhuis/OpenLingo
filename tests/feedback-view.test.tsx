import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FeedbackView } from '../src/components/FeedbackView'
import type { Feedback } from '../src/lib/types'

const feedback: Feedback = {
  scores: [
    { criterion: 'inhoud', score: 2, comment: 'Answered the question.' },
    { criterion: 'woordenschat', score: 3, comment: 'Good words.' },
    { criterion: 'grammatica', score: 1, comment: 'Word order after omdat.' },
    { criterion: 'samenhang', score: 2, comment: 'Clear order.' },
  ],
  summary: 'Nearly at B1.',
  corrections: [{ said: 'omdat ik vind het leuk', better: 'omdat ik het leuk vind', why: 'Verb goes last.' }],
  modelAnswer: 'Ik werk graag in de winkel, omdat ik het contact met klanten leuk vind.',
  coachTip: 'Practise subordinate clauses.',
}

describe('FeedbackView', () => {
  it('shows verdict, transcript, scores, corrections, tip and model answer', () => {
    const html = renderToStaticMarkup(<FeedbackView feedback={feedback} transcript="ik werk graag" />)
    expect(html).toContain('Not yet')
    expect(html).toContain('ik werk graag')
    expect(html).toContain('Almost')
    expect(html).toContain('omdat ik het leuk vind')
    expect(html).toContain('Practise subordinate clauses.')
    expect(html).toContain('contact met klanten')
  })

  it('says so when no speech was recognised', () => {
    const html = renderToStaticMarkup(<FeedbackView feedback={feedback} transcript="" />)
    expect(html).toContain('Nothing recognised.')
  })
})
