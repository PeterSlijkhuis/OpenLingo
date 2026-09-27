import { EXAMS } from './exams'
import { chatJson, type ChatMessage, type LlmSettings } from './llm'
import type { Adaptation } from './progress'
import {
  CRITERIA,
  type Correction,
  type CriterionScore,
  type Feedback,
  type Level,
  type Score,
  type SpeakingTask,
  type TaskKind,
} from './types'

export type FeedbackLanguage = 'en' | 'nl'

const KIND_GUIDE: Record<TaskKind, string> = {
  short:
    'A short task: the candidate reacts to a concrete situation in one or two sentences ' +
    '(ask something, apologise, give information, make a request). End with "Wat zegt u?" or a direct question.',
  medium:
    'A medium task: the candidate answers in a few sentences, e.g. gives an opinion with a reason, ' +
    'gives advice, describes an experience, compares two options or explains a choice.',
  long:
    'A long task: the candidate gives a structured two-minute talk after preparation, e.g. weighs ' +
    'pros and cons, argues a position or gives substantiated advice. List 3 or 4 points the talk must cover.',
}

const LEVEL_GUIDE: Record<Level, string> = {
  A2: 'CEFR A2: familiar everyday situations, concrete and personal, short simple sentences, common words.',
  B1: 'CEFR B1: everyday life, work and study; the candidate can give opinions, reasons and plans in connected sentences.',
  B2: 'CEFR B2: work, study and society, including abstract topics; the candidate argues clearly with nuance and detail.',
}

const FOCUS_GUIDE = {
  inhoud: 'Make the task ask for two or three specific things, so completeness can be checked.',
  woordenschat: 'Pick a situation that needs specific domain words beyond the most basic ones.',
  grammatica:
    'Make the task naturally require a past tense, a conditional (zou/zouden) or a subordinate clause (omdat, als, dat).',
  samenhang: 'Make the task ask for reasons or a sequence, so linking words (omdat, daarom, eerst, daarna, maar) are needed.',
} as const

const DIFFICULTY_GUIDE = {
  support: 'The learner has been struggling: keep the situation very concrete and the question simple, at the lower end of the level.',
  standard: 'Aim at the middle of the level, like a typical exam task.',
  stretch: 'The learner has been scoring well: aim at the upper end of the level with a less predictable situation.',
} as const

export function buildTaskPrompt(
  level: Level,
  kind: TaskKind,
  adaptation: Adaptation,
  recentQuestions: string[],
): ChatMessage[] {
  const system = [
    `You write original speaking tasks for practising the Dutch exam "${EXAMS[level].name}".`,
    'Tasks follow the official format: a short situation (addressing the candidate as "u") followed by a question or instruction.',
    'Never copy tasks from official or published exams; invent new, realistic situations set in the Netherlands.',
    LEVEL_GUIDE[level],
    KIND_GUIDE[kind],
    'Write the situation and question in Dutch at the target level.',
    'Reply with JSON only: {"situation": string, "question": string, "contentPoints": string[]}.',
    'contentPoints lists, in Dutch, the 2 to 4 things a complete answer must contain.',
  ].join('\n')

  const user = [
    `Topic: ${adaptation.topic}.`,
    `Focus: ${FOCUS_GUIDE[adaptation.focus]}`,
    `Difficulty: ${DIFFICULTY_GUIDE[adaptation.difficulty]}`,
    recentQuestions.length
      ? `Do not repeat or closely resemble these recent questions:\n- ${recentQuestions.join('\n- ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Generated task is missing "${field}".`)
  return v.trim()
}

export function parseTask(
  raw: unknown,
  level: Level,
  kind: TaskKind,
  topic: string,
  id: string,
): SpeakingTask {
  const o = (raw ?? {}) as Record<string, unknown>
  const points = Array.isArray(o.contentPoints)
    ? o.contentPoints.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : []
  if (points.length === 0) throw new Error('Generated task is missing "contentPoints".')
  return {
    id,
    level,
    kind,
    topic,
    situation: str(o.situation, 'situation'),
    question: str(o.question, 'question'),
    contentPoints: points.map((p) => p.trim()),
  }
}

export async function generateTask(
  settings: LlmSettings,
  level: Level,
  kind: TaskKind,
  adaptation: Adaptation,
  recentQuestions: string[],
  fetchImpl?: typeof fetch,
): Promise<SpeakingTask> {
  const raw = await chatJson(settings, buildTaskPrompt(level, kind, adaptation, recentQuestions), fetchImpl)
  const id = `${level}-${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return parseTask(raw, level, kind, adaptation.topic, id)
}

export interface AnswerInfo {
  transcript: string
  /** Seconds the candidate actually spoke (recording length). */
  seconds: number
  /** Seconds allowed for this task in the exam. */
  allowedSeconds: number
}

export function buildFeedbackPrompt(
  task: SpeakingTask,
  answer: AnswerInfo,
  language: FeedbackLanguage,
): ChatMessage[] {
  const lang = language === 'nl' ? 'Dutch (simple, at the learner\'s level)' : 'English'
  const system = [
    `You are an experienced NT2 examiner and speaking coach for "${EXAMS[task.level].name}".`,
    LEVEL_GUIDE[task.level],
    'Judge the answer against what is required to pass at this level, not against a native speaker.',
    'Score each criterion 0-3: 0 = insufficient, 1 = almost, 2 = sufficient (pass), 3 = good.',
    'Criteria: inhoud (answers the question and covers the content points, suitable for the situation),',
    'woordenschat (range and accuracy of words), grammatica (sentence structure, verb forms, word order),',
    'samenhang (logical order and linking words).',
    'The transcript comes from automatic speech recognition: ignore punctuation and capitals.',
    'Garbled or odd words may be recognition or pronunciation problems; mention them as possible pronunciation issues rather than grammar errors.',
    'An empty or nearly empty answer scores 0 for inhoud.',
    `Write summary, comments, "why" and coachTip in ${lang}. Write "better" and modelAnswer in Dutch.`,
    'Reply with JSON only:',
    '{"scores":[{"criterion":"inhoud"|"woordenschat"|"grammatica"|"samenhang","score":0-3,"comment":string}],',
    '"summary":string,"corrections":[{"said":string,"better":string,"why":string}],"modelAnswer":string,"coachTip":string}',
    'corrections: at most 5, "said" quoted from the transcript. modelAnswer: fits the time limit at the target level.',
    'coachTip: the single most useful thing to practise next, concrete and encouraging.',
  ].join('\n')

  const user = [
    `Situation: ${task.situation}`,
    `Question: ${task.question}`,
    `Content points: ${task.contentPoints.join('; ')}`,
    `Answer time used: ${Math.round(answer.seconds)} of ${answer.allowedSeconds} seconds.`,
    `Transcript: """${answer.transcript.trim() || '(no speech recognised)'}"""`,
  ].join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

function toScore(v: unknown): Score {
  const n = Math.round(Number(v))
  return (Number.isFinite(n) ? Math.min(3, Math.max(0, n)) : 0) as Score
}

export function parseFeedback(raw: unknown): Feedback {
  const o = (raw ?? {}) as Record<string, unknown>
  const given = Array.isArray(o.scores) ? (o.scores as Record<string, unknown>[]) : []
  const scores: CriterionScore[] = CRITERIA.map((criterion) => {
    const s = given.find((g) => g?.criterion === criterion)
    if (!s) throw new Error(`Feedback is missing a score for "${criterion}".`)
    return { criterion, score: toScore(s.score), comment: String(s.comment ?? '') }
  })
  const corrections: Correction[] = (Array.isArray(o.corrections) ? o.corrections : [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({ said: String(c.said ?? ''), better: String(c.better ?? ''), why: String(c.why ?? '') }))
    .filter((c) => c.better)
    .slice(0, 5)
  return {
    scores,
    summary: String(o.summary ?? ''),
    corrections,
    modelAnswer: String(o.modelAnswer ?? ''),
    coachTip: String(o.coachTip ?? ''),
  }
}

export async function coachAnswer(
  settings: LlmSettings,
  task: SpeakingTask,
  answer: AnswerInfo,
  language: FeedbackLanguage,
  fetchImpl?: typeof fetch,
): Promise<Feedback> {
  return parseFeedback(await chatJson(settings, buildFeedbackPrompt(task, answer, language), fetchImpl))
}

/** Pass/fail reading of a set of scores: every criterion must reach 2 ("sufficient"). */
export function passes(scores: CriterionScore[]): boolean {
  return scores.every((s) => s.score >= 2)
}
