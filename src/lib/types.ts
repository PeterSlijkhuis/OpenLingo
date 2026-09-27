export type Level = 'A2' | 'B1' | 'B2'

/** Answer length category, mirroring the official exam task types. */
export type TaskKind = 'short' | 'medium' | 'long'

export interface SpeakingTask {
  id: string
  level: Level
  kind: TaskKind
  /** Everyday domain, e.g. "werk", "gezondheid". Used to vary practice. */
  topic: string
  /** Context shown before the question, in Dutch. */
  situation: string
  /** The question or instruction the candidate answers, in Dutch. */
  question: string
  /** What a complete answer covers, in Dutch. Used to score task completion. */
  contentPoints: string[]
}

export const CRITERIA = ['inhoud', 'woordenschat', 'grammatica', 'samenhang'] as const
export type Criterion = (typeof CRITERIA)[number]

/** 0 = insufficient, 1 = almost, 2 = sufficient, 3 = good for this level. */
export type Score = 0 | 1 | 2 | 3

export interface CriterionScore {
  criterion: Criterion
  score: Score
  comment: string
}

export interface Correction {
  said: string
  better: string
  why: string
}

export interface Feedback {
  scores: CriterionScore[]
  /** One or two sentences: would this pass at the target level, and why. */
  summary: string
  corrections: Correction[]
  /** A model answer at the target level, in Dutch. */
  modelAnswer: string
  /** The single most useful thing to practise next. */
  coachTip: string
}

export interface Attempt {
  taskId: string
  level: Level
  kind: TaskKind
  topic: string
  at: number
  scores: Record<Criterion, Score>
}
