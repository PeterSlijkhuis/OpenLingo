export type Level = 'A2' | 'B1' | 'B2'

/** Exam parts. KNM (Kennis van de Nederlandse Maatschappij) belongs to the inburgering exam. */
export const SKILLS = ['spreken', 'schrijven', 'lezen', 'luisteren', 'knm'] as const
export type Skill = (typeof SKILLS)[number]
export type QuizSkill = Extract<Skill, 'lezen' | 'luisteren' | 'knm'>

/** Answer length category, mirroring the official exam task types. */
export type TaskKind = 'short' | 'medium' | 'long'

/** Picture-based speaking tasks, like the pictures and videos in the exam. */
export const PICTURE_MODES = ['describe', 'compare', 'story'] as const
export type PictureMode = (typeof PICTURE_MODES)[number]

export interface Picture {
  /** What the picture shows, in Dutch. Hidden from the candidate; the examiner uses it. */
  description: string
  /** Image URL (a data URL: a generated SVG drawing or an AI image). */
  src: string
}

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
  /** Pictures to talk about, in order. */
  pictures?: Picture[]
  /** Shown when AI images failed and drawings are used instead. */
  pictureNote?: string
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

export interface WritingTask {
  id: string
  level: Level
  topic: string
  /** Context in Dutch, e.g. who you write to and why. */
  situation: string
  /** The instruction in Dutch. */
  task: string
  contentPoints: string[]
  minWords: number
  maxWords: number
}

export interface QuizQuestion {
  question: string
  options: string[]
  /** Index into options. */
  answer: number
  /** Why the answer is right, in the feedback language. */
  explanation: string
}

export interface Quiz {
  id: string
  skill: QuizSkill
  level: Level
  topic: string
  title: string
  /** Reading text, or the script that is read aloud for listening. Empty for KNM. */
  text: string
  questions: QuizQuestion[]
}

export interface Attempt {
  /** Missing on attempts saved before other skills existed: those are speaking. */
  skill?: Skill
  taskId: string
  level: Level
  kind?: TaskKind
  topic: string
  at: number
  /** Criterion scores for speaking and writing. */
  scores?: Record<Criterion, Score>
  /** Right answers for quizzes. */
  correct?: number
  total?: number
}
