import type { Level, TaskKind } from './types'

export interface ExamSpec {
  level: Level
  name: string
  /** Tasks per kind in one mock exam, asked in the order short, medium, long. */
  composition: Partial<Record<TaskKind, number>>
  answerSeconds: Record<TaskKind, number>
  officialPracticeUrl: string
}

// Staatsexamen formats from staatsexamensnt2.nl ("Hoe ziet het examen eruit?"):
// Programma I = 8 short (20 s) + 8 medium (30 s); Programma II = 4 short + 8 medium + 1 long (2 min).
// A2 inburgering: 16 questions of about one minute, as described by DUO and exam-prep sites.
export const EXAMS: Record<Level, ExamSpec> = {
  A2: {
    level: 'A2',
    name: 'Inburgeringsexamen Spreken A2',
    composition: { medium: 16 },
    answerSeconds: { short: 30, medium: 60, long: 120 },
    officialPracticeUrl: 'https://www.inburgeren.nl/examen-doen/oefenen.jsp',
  },
  B1: {
    level: 'B1',
    name: 'Staatsexamen NT2 Programma I (B1)',
    composition: { short: 8, medium: 8 },
    answerSeconds: { short: 20, medium: 30, long: 120 },
    officialPracticeUrl: 'https://oefenexamensnt2.nl',
  },
  B2: {
    level: 'B2',
    name: 'Staatsexamen NT2 Programma II (B2)',
    composition: { short: 4, medium: 8, long: 1 },
    answerSeconds: { short: 20, medium: 30, long: 120 },
    officialPracticeUrl: 'https://oefenexamensnt2.nl',
  },
}

/** Reading time before recording starts. The exam's own prep times are not published. */
export const PREP_SECONDS: Record<TaskKind, number> = { short: 10, medium: 15, long: 60 }

export const LEVELS: Level[] = ['A2', 'B1', 'B2']

/** The task kinds of one mock exam, in the order they are asked. */
export function examSequence(level: Level): TaskKind[] {
  const { composition } = EXAMS[level]
  return (['short', 'medium', 'long'] as const).flatMap((kind) =>
    Array<TaskKind>(composition[kind] ?? 0).fill(kind),
  )
}

/** Kinds that occur in a level's exam, for single-task practice. */
export function kindsFor(level: Level): TaskKind[] {
  return (['short', 'medium', 'long'] as const).filter((k) => (EXAMS[level].composition[k] ?? 0) > 0)
}
