import { describe, expect, it } from 'vitest'
import {
  buildFeedbackPrompt,
  buildTaskPrompt,
  coachAnswer,
  generateTask,
  parseFeedback,
  parseTask,
  passes,
} from '../src/lib/coach'
import { chatJson, type LlmSettings } from '../src/lib/llm'
import type { SpeakingTask } from '../src/lib/types'

const settings: LlmSettings = { baseUrl: 'https://api.example.com/v1/', apiKey: 'k', model: 'm' }

const task: SpeakingTask = {
  id: 't1',
  level: 'B1',
  kind: 'medium',
  topic: 'werk',
  situation: 'U werkt in een supermarkt.',
  question: 'Wat vindt u leuk aan uw werk? Leg uit waarom.',
  contentPoints: ['iets wat leuk is', 'een reden'],
}

function fakeFetch(reply: unknown, status = 200) {
  const calls: { url: string; body: Record<string, unknown>; headers: Record<string, string> }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> })
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }),
      { status },
    )
  }) as unknown as typeof fetch
  return { impl, calls }
}

const goodFeedback = {
  scores: [
    { criterion: 'inhoud', score: 2, comment: 'ok' },
    { criterion: 'woordenschat', score: 3, comment: 'rich' },
    { criterion: 'grammatica', score: 1, comment: 'word order' },
    { criterion: 'samenhang', score: 2, comment: 'fine' },
  ],
  summary: 'Almost there.',
  corrections: [{ said: 'ik werk graag omdat ik vind het leuk', better: 'omdat ik het leuk vind', why: 'verb at the end' }],
  modelAnswer: 'Ik vind mijn werk leuk omdat…',
  coachTip: 'Practise word order after omdat.',
}

describe('task generation', () => {
  it('asks for original tasks in the official format, with adaptation and recent questions', () => {
    const [system, user] = buildTaskPrompt('B2', 'long', { topic: 'milieu en klimaat', focus: 'samenhang', difficulty: 'stretch' }, ['Oude vraag?'])
    expect(system.content).toContain('Staatsexamen NT2 Programma II')
    expect(system.content).toContain('Never copy tasks')
    expect(system.content).toContain('two-minute talk')
    expect(user.content).toContain('milieu en klimaat')
    expect(user.content).toContain('linking words')
    expect(user.content).toContain('upper end')
    expect(user.content).toContain('Oude vraag?')
  })

  it('parses a generated task and rejects incomplete ones', () => {
    const t = parseTask({ situation: ' S ', question: 'Q?', contentPoints: ['a', '', 3] }, 'A2', 'medium', 'weer', 'x')
    expect(t).toMatchObject({ id: 'x', level: 'A2', kind: 'medium', topic: 'weer', situation: 'S', contentPoints: ['a'] })
    expect(() => parseTask({ situation: 'S', contentPoints: ['a'] }, 'A2', 'medium', 'weer', 'x')).toThrow('question')
    expect(() => parseTask({ situation: 'S', question: 'Q' }, 'A2', 'medium', 'weer', 'x')).toThrow('contentPoints')
  })

  it('calls the chat completions endpoint with the key and JSON mode', async () => {
    const { impl, calls } = fakeFetch({ situation: 'S', question: 'Q?', contentPoints: ['p'] })
    const t = await generateTask(settings, 'B1', 'short', { topic: 'werk', focus: 'inhoud', difficulty: 'standard' }, [], impl)
    expect(t.question).toBe('Q?')
    expect(calls[0].url).toBe('https://api.example.com/v1/chat/completions')
    expect(calls[0].headers.Authorization).toBe('Bearer k')
    expect(calls[0].body.model).toBe('m')
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' })
  })
})

describe('coaching', () => {
  it('gives the examiner the task, the timing and the transcript', () => {
    const [system, user] = buildFeedbackPrompt(task, { transcript: 'ik werk graag', seconds: 12.4, allowedSeconds: 30 }, 'nl')
    expect(system.content).toContain('Staatsexamen NT2 Programma I')
    expect(system.content).toContain('automatic speech recognition')
    expect(system.content).toContain('in Dutch (simple')
    expect(user.content).toContain('12 of 30 seconds')
    expect(user.content).toContain('ik werk graag')
    expect(user.content).toContain('een reden')
  })

  it('marks an empty transcript explicitly', () => {
    const [, user] = buildFeedbackPrompt(task, { transcript: '  ', seconds: 3, allowedSeconds: 30 }, 'en')
    expect(user.content).toContain('(no speech recognised)')
  })

  it('parses feedback, clamps scores and orders criteria', () => {
    const fb = parseFeedback({
      ...goodFeedback,
      scores: [...goodFeedback.scores].reverse().map((s, i) => (i === 0 ? { ...s, score: 7 } : s)),
    })
    expect(fb.scores.map((s) => s.criterion)).toEqual(['inhoud', 'woordenschat', 'grammatica', 'samenhang'])
    expect(fb.scores[3].score).toBe(3)
    expect(fb.corrections).toHaveLength(1)
  })

  it('rejects feedback without every criterion', () => {
    expect(() => parseFeedback({ scores: goodFeedback.scores.slice(1) })).toThrow('inhoud')
  })

  it('passes only when every criterion is sufficient', async () => {
    const { impl } = fakeFetch(goodFeedback)
    const fb = await coachAnswer(settings, task, { transcript: 'x', seconds: 20, allowedSeconds: 30 }, 'en', impl)
    expect(passes(fb.scores)).toBe(false)
    expect(passes(fb.scores.map((s) => ({ ...s, score: 2 as const })))).toBe(true)
  })
})

describe('chatJson', () => {
  it('requires an API key', async () => {
    await expect(chatJson({ ...settings, apiKey: '' }, [])).rejects.toThrow('No API key')
  })

  it('reports HTTP errors', async () => {
    const { impl } = fakeFetch({}, 401)
    await expect(chatJson(settings, [], impl)).rejects.toThrow('401')
  })

  it('reports non-JSON replies', async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }))) as unknown as typeof fetch
    await expect(chatJson(settings, [], impl)).rejects.toThrow('valid JSON')
  })
})
