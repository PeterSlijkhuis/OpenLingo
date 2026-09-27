import type { Level, Skill, TaskKind } from './types'

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

export interface SkillInfo {
  title: string
  /** English name. */
  subtitle: string
  icon: string
  summary: string
  /** What the official exam part looks like, per level. */
  format: Record<Level, string>
}

// Formats from staatsexamensnt2.nl and inburgeren.nl (checked September 2026).
export const SKILL_INFO: Record<Skill, SkillInfo> = {
  spreken: {
    title: 'Spreken',
    subtitle: 'Speaking',
    icon: '🗣️',
    summary: 'Answer out loud within the time limit. Whisper transcribes you, a coach gives written feedback.',
    format: {
      A2: 'About 35 minutes on a computer: 16 questions about videos and pictures, about a minute each.',
      B1: 'About 25 minutes on a computer: 8 short answers (20 s) and 8 medium answers (30 s).',
      B2: 'About 25 minutes on a computer: 4 short, 8 medium and 1 two-minute talk.',
    },
  },
  schrijven: {
    title: 'Schrijven',
    subtitle: 'Writing',
    icon: '✍️',
    summary: 'Write emails, messages and short texts. Get corrections and a model answer.',
    format: {
      A2: '40 minutes on paper: 4 writing tasks, such as a short letter or a form.',
      B1: '100 minutes: 8 sentence tasks, 2 partial and 2 short writing tasks.',
      B2: '100 minutes: 7-8 sentence tasks, 1-2 short and 1-2 medium-length writing tasks.',
    },
  },
  lezen: {
    title: 'Lezen',
    subtitle: 'Reading',
    icon: '📖',
    summary: 'Read everyday texts and answer multiple-choice questions, with explanations.',
    format: {
      A2: '65 minutes on a computer: short everyday texts with questions.',
      B1: '110 minutes: 6 texts with 36 multiple-choice questions.',
      B2: '100 minutes: 6 texts with 36 multiple-choice questions.',
    },
  },
  luisteren: {
    title: 'Luisteren',
    subtitle: 'Listening',
    icon: '🎧',
    summary: 'Listen to conversations and announcements, then answer multiple-choice questions.',
    format: {
      A2: '45 minutes on a computer: videos and audio with questions.',
      B1: '90 minutes: about 40 multiple-choice questions on 5 or more fragments, heard once.',
      B2: '90 minutes: about 40 multiple-choice questions on 5 or more fragments, heard once.',
    },
  },
  knm: {
    title: 'KNM',
    subtitle: 'Knowledge of Dutch society',
    icon: '🏛️',
    summary: 'Multiple-choice questions about work, health, housing, history, government and daily life.',
    format: {
      A2: 'A separate part of inburgering: multiple-choice questions on a computer.',
      B1: 'Not part of the Staatsexamen; a separate part of inburgering, with multiple-choice questions.',
      B2: 'Not part of the Staatsexamen; a separate part of inburgering, with multiple-choice questions.',
    },
  },
}

export const OFFICIAL_PRACTICE = {
  staatsexamen: 'https://oefenexamensnt2.nl',
  inburgering: 'https://www.inburgeren.nl/examen-doen/oefenen.jsp',
}
