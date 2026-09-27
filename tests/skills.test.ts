import { describe, expect, it } from 'vitest'
import {
  buildQuizPrompt,
  buildWritingFeedbackPrompt,
  countWords,
  generateQuiz,
  parseQuiz,
  parseWritingTask,
  scoreQuiz,
} from '../src/lib/coach'
import { SKILL_INFO } from '../src/lib/exams'
import { adapt, KNM_TOPICS, performance, quizAccuracy } from '../src/lib/progress'
import { scriptTurns } from '../src/lib/speech'
import { SKILLS, type Attempt } from '../src/lib/types'

const adaptation = { topic: 'wonen', focus: 'inhoud' as const, difficulty: 'standard' as const }

const rawQuiz = {
  title: 'Een brief van de gemeente',
  text: 'Beste bewoner, ...',
  questions: [
    { question: 'Wie schrijft?', options: ['De gemeente', 'De buurman', 'De huisarts'], answer: 0, explanation: 'It says so.' },
    { question: 'Kapot', options: ['a', 'a'], answer: 0, explanation: '' },
    { question: 'Out of range', options: ['a', 'b'], answer: 5, explanation: '' },
  ],
}

describe('quizzes', () => {
  it('asks for original listening scripts with speaker names', () => {
    const [system, user] = buildQuizPrompt('luisteren', 'B1', adaptation, ['Oude titel'], 'en')
    expect(system.content).toContain('speaker name and a colon')
    expect(system.content).toContain('Never copy')
    expect(system.content).toContain('explanation in English')
    expect(user.content).toContain('Oude titel')
  })

  it('keeps only valid questions', () => {
    const quiz = parseQuiz(rawQuiz, 'lezen', 'A2', 'wonen', 'q1')
    expect(quiz.questions).toHaveLength(1)
    expect(quiz.title).toBe('Een brief van de gemeente')
  })

  it('requires a text for reading and listening but not for KNM', () => {
    const noText = { ...rawQuiz, text: '' }
    expect(() => parseQuiz(noText, 'lezen', 'B1', 'wonen', 'q')).toThrow('text')
    expect(parseQuiz(noText, 'knm', 'A2', 'wonen', 'q').text).toBe('')
    expect(() => parseQuiz({ ...rawQuiz, questions: [] }, 'knm', 'A2', 'x', 'q')).toThrow('no valid questions')
  })

  it('scores answers, counting unanswered as wrong', () => {
    const quiz = parseQuiz(
      { ...rawQuiz, questions: [rawQuiz.questions[0], { ...rawQuiz.questions[0], answer: 2 }] },
      'lezen',
      'A2',
      'wonen',
      'q',
    )
    expect(scoreQuiz(quiz, [0, 2])).toBe(2)
    expect(scoreQuiz(quiz, [0, null])).toBe(1)
  })

  it('generates through the API', async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(rawQuiz) } }] }))) as unknown as typeof fetch
    const quiz = await generateQuiz({ baseUrl: 'https://x/v1', apiKey: 'k', model: 'm' }, 'lezen', 'B2', adaptation, [], 'nl', impl)
    expect(quiz.skill).toBe('lezen')
    expect(quiz.level).toBe('B2')
  })
})

describe('writing', () => {
  it('sets the word range per level and counts words', () => {
    const t = parseWritingTask({ situation: 'S', task: 'T', contentPoints: ['p'] }, 'B2', 'werk', 'w')
    expect([t.minWords, t.maxWords]).toEqual([150, 250])
    expect(countWords('  Ik  woon in\nAmsterdam ')).toBe(4)
    expect(countWords('')).toBe(0)
  })

  it('tells the examiner the text is typed and how long it is', () => {
    const t = parseWritingTask({ situation: 'S', task: 'T', contentPoints: ['p'] }, 'A2', 'werk', 'w')
    const [system, user] = buildWritingFeedbackPrompt(t, 'Ik ben ziek.', 'en')
    expect(system.content).toContain('spelling')
    expect(user.content).toContain('3 words (asked: 30-60)')
  })
})

describe('progress across skills', () => {
  const quizAttempt = (correct: number): Attempt => ({
    skill: 'lezen', taskId: 'q', level: 'B1', topic: 'wonen', at: 0, correct, total: 4,
  })

  it('treats old attempts without a skill as speaking', () => {
    const old = { taskId: 't', level: 'B1', topic: 'werk', at: 0, scores: { inhoud: 0, woordenschat: 0, grammatica: 0, samenhang: 0 } } as Attempt
    expect(adapt([old, old, old], 'B1', 'spreken').difficulty).toBe('support')
    expect(adapt([old, old, old], 'B1', 'lezen').difficulty).toBe('standard')
  })

  it('adapts quiz difficulty from accuracy', () => {
    expect(performance(quizAttempt(4))).toBe(3)
    expect(adapt([quizAttempt(4), quizAttempt(4), quizAttempt(3)], 'B1', 'lezen').difficulty).toBe('stretch')
    expect(quizAccuracy([quizAttempt(4), quizAttempt(2)])).toBe(0.75)
  })

  it('uses KNM themes for KNM', () => {
    expect(KNM_TOPICS).toContain(adapt([], 'A2', 'knm').topic)
  })

  it('describes the official format of every part at every level', () => {
    for (const s of SKILLS) for (const l of ['A2', 'B1', 'B2'] as const) expect(SKILL_INFO[s].format[l]).toBeTruthy()
  })
})

describe('listening scripts', () => {
  it('splits speakers and keeps narration', () => {
    expect(scriptTurns('Anna: Hoi Mark!\nMark: Hallo.\n\nHet is druk op het station.')).toEqual([
      { speaker: 'Anna', text: 'Hoi Mark!' },
      { speaker: 'Mark', text: 'Hallo.' },
      { speaker: '', text: 'Het is druk op het station.' },
    ])
  })
})
