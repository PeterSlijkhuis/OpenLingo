import { describe, expect, it } from 'vitest'
import { adapt, criterionAverages, doneToday, streak, TOPICS } from '../src/lib/progress'
import type { Attempt, Criterion, Level, Score } from '../src/lib/types'

function attempt(level: Level, topic: string, s: Partial<Record<Criterion, Score>> = {}): Attempt {
  return {
    taskId: Math.random().toString(),
    level,
    kind: 'medium',
    topic,
    at: 0,
    scores: { inhoud: 2, woordenschat: 2, grammatica: 2, samenhang: 2, ...s },
  }
}

describe('adapt', () => {
  it('starts at standard difficulty focused on task completion', () => {
    const a = adapt([], 'B1', 'spreken', () => 0)
    expect(a).toEqual({ topic: TOPICS.B1[0], focus: 'inhoud', difficulty: 'standard' })
  })

  it('avoids topics used recently', () => {
    const used = TOPICS.B1.slice(0, TOPICS.B1.length - 1)
    const history = used.slice(-8).map((t) => attempt('B1', t))
    for (let i = 0; i < 20; i++) {
      expect(history.map((h) => h.topic)).not.toContain(adapt(history, 'B1').topic)
    }
  })

  it('focuses on the weakest criterion', () => {
    const history = [attempt('B1', 'werk', { grammatica: 0 }), attempt('B1', 'wonen', { grammatica: 1 })]
    expect(adapt(history, 'B1').focus).toBe('grammatica')
  })

  it('steps difficulty up after strong answers and down after weak ones', () => {
    const strong = Array.from({ length: 3 }, () =>
      attempt('B2', 'media', { inhoud: 3, woordenschat: 3, grammatica: 3, samenhang: 2 }),
    )
    expect(adapt(strong, 'B2').difficulty).toBe('stretch')
    const weak = Array.from({ length: 3 }, () =>
      attempt('B2', 'media', { inhoud: 1, woordenschat: 1, grammatica: 0, samenhang: 1 }),
    )
    expect(adapt(weak, 'B2').difficulty).toBe('support')
  })

  it('ignores attempts at other levels', () => {
    const history = Array.from({ length: 5 }, () => attempt('A2', 'weer', { grammatica: 0 }))
    const a = adapt(history, 'B1', 'spreken', () => 0)
    expect(a.focus).toBe('inhoud')
    expect(a.difficulty).toBe('standard')
  })
})

describe('criterionAverages', () => {
  it('averages each criterion', () => {
    const avg = criterionAverages([attempt('B1', 'werk', { inhoud: 3 }), attempt('B1', 'werk', { inhoud: 1 })])
    expect(avg.inhoud).toBe(2)
    expect(avg.grammatica).toBe(2)
  })
})

describe('streak and daily count', () => {
  const day = (d: number, h = 12) => new Date(2026, 8, d, h).getTime()
  const at = (t: number) => ({ taskId: 'x', level: 'B1' as const, topic: 't', at: t })

  it('counts consecutive practice days up to today or yesterday', () => {
    const history = [at(day(20)), at(day(22)), at(day(23, 9)), at(day(23, 20)), at(day(24))]
    expect(streak(history, day(24, 22))).toBe(3)
    expect(streak(history, day(25, 8))).toBe(3)
    expect(streak(history, day(26))).toBe(0)
    expect(streak([], day(26))).toBe(0)
  })

  it('counts exercises finished today', () => {
    expect(doneToday([at(day(23, 9)), at(day(23, 20)), at(day(22))], day(23, 21))).toBe(2)
  })
})
