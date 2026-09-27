import { CRITERIA, type Attempt, type Criterion, type Level } from './types'

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

export type Difficulty = 'support' | 'standard' | 'stretch'

export interface Adaptation {
  topic: string
  focus: Criterion
  difficulty: Difficulty
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Pick the next situation's topic, focus and difficulty from the learner's recent attempts. */
export function adapt(history: Attempt[], level: Level, random: () => number = Math.random): Adaptation {
  const atLevel = history.filter((a) => a.level === level)
  const recent = atLevel.slice(-10)

  // Topic: prefer ones not used in the last attempts; fall back to the whole list.
  const used = new Set(atLevel.slice(-8).map((a) => a.topic))
  const fresh = TOPICS[level].filter((t) => !used.has(t))
  const pool = fresh.length ? fresh : TOPICS[level]
  const topic = pool[Math.floor(random() * pool.length)]

  // Focus: the criterion with the lowest recent average; task completion when there is no data.
  let focus: Criterion = 'inhoud'
  if (recent.length) {
    let lowest = Infinity
    for (const c of CRITERIA) {
      const m = mean(recent.map((a) => a.scores[c]))
      if (m < lowest) {
        lowest = m
        focus = c
      }
    }
  }

  // Difficulty: step up after strong answers, step down after weak ones.
  const last = atLevel.slice(-5)
  const avg = mean(last.map((a) => mean(CRITERIA.map((c) => a.scores[c]))))
  const difficulty: Difficulty =
    last.length >= 3 && avg >= 2.5 ? 'stretch' : last.length >= 3 && avg < 1.25 ? 'support' : 'standard'

  return { topic, focus, difficulty }
}

/** Average score per criterion over the given attempts. */
export function criterionAverages(attempts: Attempt[]): Record<Criterion, number> {
  return Object.fromEntries(
    CRITERIA.map((c) => [c, mean(attempts.map((a) => a.scores[c]))]),
  ) as Record<Criterion, number>
}
