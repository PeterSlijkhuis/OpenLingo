import { CRITERIA, type Attempt, type Criterion, type Level, type Skill } from './types'

/** Everyday domains used in NT2 speaking tasks. B2 adds more abstract, societal topics. */
export const TOPICS: Record<Level, string[]> = {
  A2: [
    'kennismaken', 'familie', 'wonen', 'boodschappen', 'gezondheid', 'huisarts', 'werk',
    'vrije tijd', 'vervoer', 'weer', 'school van de kinderen', 'buren', 'gemeente', 'eten en drinken',
  ],
  B1: [
    'werk', 'solliciteren', 'opleiding', 'wonen', 'gezondheid', 'vrije tijd', 'vervoer', 'buren',
    'gemeente en instanties', 'geld en rekeningen', 'feesten en tradities', 'reizen', 'klachten',
    'kinderen en opvoeding', 'sport', 'vrijwilligerswerk',
  ],
  B2: [
    'werk en loopbaan', 'onderwijs', 'gezondheidszorg', 'wonen en woningmarkt', 'milieu en klimaat',
    'technologie', 'media', 'politiek en samenleving', 'cultuur', 'verkeer en mobiliteit',
    'economie', 'integratie', 'vrijwilligerswerk', 'consumentenrechten',
  ],
}

/** KNM themes (Kennis van de Nederlandse Maatschappij), the same at every level. */
export const KNM_TOPICS = [
  'werk en inkomen', 'omgangsvormen, waarden en normen', 'wonen', 'gezondheid en zorg',
  'geschiedenis en geografie', 'instanties', 'staatsinrichting en rechtsstaat', 'onderwijs en opvoeding',
]

export type Difficulty = 'support' | 'standard' | 'stretch'

export interface Adaptation {
  topic: string
  focus: Criterion
  difficulty: Difficulty
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

export function skillOf(a: Attempt): Skill {
  return a.skill ?? 'spreken'
}

/** Performance on a 0-3 scale: criterion average, or quiz accuracy scaled to 3. */
export function performance(a: Attempt): number {
  if (a.scores) return mean(CRITERIA.map((c) => a.scores![c]))
  return a.total ? ((a.correct ?? 0) / a.total) * 3 : 0
}

/** Pick the next task's topic, focus and difficulty from the learner's recent attempts at this skill. */
export function adapt(
  history: Attempt[],
  level: Level,
  skill: Skill = 'spreken',
  random: () => number = Math.random,
): Adaptation {
  const mine = history.filter((a) => a.level === level && skillOf(a) === skill)
  const topics = skill === 'knm' ? KNM_TOPICS : TOPICS[level]

  // Topic: prefer ones not used in the last attempts; fall back to the whole list.
  const used = new Set(mine.slice(-8).map((a) => a.topic))
  const fresh = topics.filter((t) => !used.has(t))
  const pool = fresh.length ? fresh : topics
  const topic = pool[Math.floor(random() * pool.length)]

  // Focus: the criterion with the lowest recent average; task completion when there is no data.
  const recent = mine.filter((a) => a.scores).slice(-10)
  let focus: Criterion = 'inhoud'
  if (recent.length) {
    let lowest = Infinity
    for (const c of CRITERIA) {
      const m = mean(recent.map((a) => a.scores![c]))
      if (m < lowest) {
        lowest = m
        focus = c
      }
    }
  }

  // Difficulty: step up after strong results, step down after weak ones.
  const last = mine.slice(-5)
  const avg = mean(last.map(performance))
  const difficulty: Difficulty =
    last.length >= 3 && avg >= 2.5 ? 'stretch' : last.length >= 3 && avg < 1.25 ? 'support' : 'standard'

  return { topic, focus, difficulty }
}

/** Average score per criterion over the given attempts. */
export function criterionAverages(attempts: Attempt[]): Record<Criterion, number> {
  const scored = attempts.filter((a) => a.scores)
  return Object.fromEntries(
    CRITERIA.map((c) => [c, mean(scored.map((a) => a.scores![c]))]),
  ) as Record<Criterion, number>
}

/** Share of quiz questions answered correctly, 0-1. */
export function quizAccuracy(attempts: Attempt[]): number {
  const total = attempts.reduce((n, a) => n + (a.total ?? 0), 0)
  return total ? attempts.reduce((n, a) => n + (a.correct ?? 0), 0) / total : 0
}
