import { EXAMS } from './exams'
import { chatJson, generateImage, type ChatMessage, type LlmSettings } from './llm'
import type { Adaptation } from './progress'
import {
  CRITERIA,
  type Correction,
  type CriterionScore,
  type Feedback,
  type Level,
  type Picture,
  type PictureMode,
  type Score,
  type SpeakingTask,
  type TaskKind,
  type Quiz,
  type QuizQuestion,
  type QuizSkill,
  type WritingTask,
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

export const PICTURE_COUNT: Record<PictureMode, number> = { describe: 1, compare: 2, story: 4 }

const PICTURE_GUIDE: Record<PictureMode, string> = {
  describe:
    'The task is about one picture of an everyday scene. The candidate describes what they see ' +
    'or reacts to it (who, where, what is happening, what might happen next).',
  compare:
    'The task shows two pictures of two options (e.g. two ways to travel, two jobs, two houses). ' +
    'The candidate picks one and explains why.',
  story:
    'The task shows four pictures that tell a short story in order. The candidate tells what happens ' +
    'in the right order, using linking words (eerst, daarna, toen, uiteindelijk).',
}

/** Answer time category for a picture task at a level. */
export function pictureKind(level: Level, mode: PictureMode): TaskKind {
  return mode === 'story' && (EXAMS[level].composition.long ?? 0) > 0 ? 'long' : 'medium'
}

function pictureRules(mode: PictureMode): string[] {
  const n = PICTURE_COUNT[mode]
  return [
    PICTURE_GUIDE[mode],
    `Also return "pictures": exactly ${n} item${n > 1 ? 's' : ''}, in order, each {"description": string, "svg": string}.`,
    'description: in Dutch, exactly what the picture shows (people, what they do, objects, place). ' +
      'The examiner uses it, and it is used to create a photo, so keep the same people recognisable across pictures.',
    'svg: a simple illustration of the same scene as one standalone <svg> element with viewBox="0 0 400 300": ' +
      'flat colours, simple shapes, a light background, no text, no scripts, at most 3000 characters.',
    'The situation and question must not describe what is in the pictures: the candidate has to look.',
  ]
}

export function buildTaskPrompt(
  level: Level,
  kind: TaskKind,
  adaptation: Adaptation,
  recentQuestions: string[],
  picture?: PictureMode,
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
    ...(picture ? pictureRules(picture) : []),
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

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Generated task is missing "${field}".`)
  return v.trim()
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function parsePictures(raw: unknown, count: number): Picture[] {
  const pictures = (Array.isArray(raw) ? raw : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => {
      const svg = String(p.svg ?? '')
      const start = svg.indexOf('<svg')
      const end = svg.lastIndexOf('</svg>')
      return {
        description: String(p.description ?? '').trim(),
        // Shown through <img>, so scripts inside a generated SVG never run.
        src: start >= 0 && end > start ? svgDataUrl(svg.slice(start, end + 6)) : '',
      }
    })
    .filter((p) => p.description && p.src)
  if (pictures.length < count) throw new Error('Generated task is missing its pictures. Try again.')
  return pictures.slice(0, count)
}

export function parseTask(
  raw: unknown,
  level: Level,
  kind: TaskKind,
  topic: string,
  id: string,
  picture?: PictureMode,
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
    ...(picture ? { pictures: parsePictures(o.pictures, PICTURE_COUNT[picture]) } : {}),
  }
}

export interface TaskSettings extends LlmSettings {
  pictureSource?: 'drawings' | 'ai'
  imageModel?: string
}

export function imagePrompt(pictures: Picture[], i: number): string {
  const story = pictures.length > 1 ? `This is picture ${i + 1} of ${pictures.length}. All pictures: ${pictures.map((p) => p.description).join(' | ')}. ` : ''
  return (
    'A clear, realistic photo of an everyday scene in the Netherlands, for a Dutch language exam. ' +
    `No text, letters or signs with words. ${story}Show: ${pictures[i].description}`
  )
}

/** Swap the drawings for AI images. Keeps the drawings, with a note, if that fails. */
async function illustrate(settings: TaskSettings, task: SpeakingTask, fetchImpl?: typeof fetch): Promise<SpeakingTask> {
  const pictures = task.pictures ?? []
  try {
    const srcs = await Promise.all(
      pictures.map((_, i) => generateImage(settings, settings.imageModel || 'gpt-image-1', imagePrompt(pictures, i), fetchImpl)),
    )
    return { ...task, pictures: pictures.map((p, i) => ({ ...p, src: srcs[i] })) }
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    return { ...task, pictureNote: `AI images failed, showing drawings instead. ${why}` }
  }
}

export async function generateTask(
  settings: TaskSettings,
  level: Level,
  kind: TaskKind,
  adaptation: Adaptation,
  recentQuestions: string[],
  fetchImpl?: typeof fetch,
  picture?: PictureMode,
): Promise<SpeakingTask> {
  const raw = await chatJson(settings, buildTaskPrompt(level, kind, adaptation, recentQuestions, picture), fetchImpl)
  const task = parseTask(raw, level, kind, adaptation.topic, newId(`${level}-${kind}`), picture)
  return picture && settings.pictureSource === 'ai' ? illustrate(settings, task, fetchImpl) : task
}

export interface AnswerInfo {
  transcript: string
  /** Seconds the candidate actually spoke (recording length). */
  seconds: number
  /** Seconds allowed for this task in the exam. */
  allowedSeconds: number
}

const EXAMINER_RULES = [
  'Judge the answer against what is required to pass at this level, not against a native speaker.',
  'Score each criterion 0-3: 0 = insufficient, 1 = almost, 2 = sufficient (pass), 3 = good.',
  'Criteria: inhoud (answers the task and covers the content points, suitable for the situation),',
  'woordenschat (range and accuracy of words), grammatica (sentence structure, verb forms, word order),',
  'samenhang (logical order and linking words).',
]

function feedbackFormat(language: FeedbackLanguage, modelAnswerNote: string): string[] {
  const lang = language === 'nl' ? "Dutch (simple, at the learner's level)" : 'English'
  return [
    `Write summary, comments, "why" and coachTip in ${lang}. Write "better" and modelAnswer in Dutch.`,
    'Reply with JSON only:',
    '{"scores":[{"criterion":"inhoud"|"woordenschat"|"grammatica"|"samenhang","score":0-3,"comment":string}],',
    '"summary":string,"corrections":[{"said":string,"better":string,"why":string}],"modelAnswer":string,"coachTip":string}',
    `corrections: at most 5, "said" quoted from the answer. modelAnswer: ${modelAnswerNote}`,
    'coachTip: the single most useful thing to practise next, concrete and encouraging.',
  ]
}

export function buildFeedbackPrompt(
  task: SpeakingTask,
  answer: AnswerInfo,
  language: FeedbackLanguage,
): ChatMessage[] {
  const system = [
    `You are an experienced NT2 examiner and speaking coach for "${EXAMS[task.level].name}".`,
    LEVEL_GUIDE[task.level],
    ...EXAMINER_RULES,
    'The transcript comes from automatic speech recognition: ignore punctuation and capitals.',
    'Garbled or odd words may be recognition or pronunciation problems; mention them as possible pronunciation issues rather than grammar errors.',
    'An empty or nearly empty answer scores 0 for inhoud.',
    ...feedbackFormat(language, 'fits the time limit at the target level.'),
  ].join('\n')

  const user = [
    `Situation: ${task.situation}`,
    `Question: ${task.question}`,
    `Content points: ${task.contentPoints.join('; ')}`,
    task.pictures?.length
      ? `Pictures shown to the candidate, in order:\n${task.pictures.map((p, i) => `${i + 1}. ${p.description}`).join('\n')}`
      : '',
    `Answer time used: ${Math.round(answer.seconds)} of ${answer.allowedSeconds} seconds.`,
    `Transcript: """${answer.transcript.trim() || '(no speech recognised)'}"""`,
  ]
    .filter(Boolean)
    .join('\n')

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

// ── Writing ──────────────────────────────────────────────────────────────────

const WRITING_GUIDE: Record<Level, string> = {
  A2: 'An A2 inburgering task: a short note, email, message or form answer of about 30-60 words.',
  B1: 'A Staatsexamen I task: an email or message of about 60-120 words, e.g. asking, complaining, explaining or giving an opinion.',
  B2: 'A Staatsexamen II task: a longer email, letter or short argumentative text of about 150-250 words.',
}

const WORD_RANGE: Record<Level, [number, number]> = { A2: [30, 60], B1: [60, 120], B2: [150, 250] }

export function buildWritingTaskPrompt(
  level: Level,
  adaptation: Adaptation,
  recentTasks: string[],
): ChatMessage[] {
  const system = [
    `You write original writing tasks for practising the Dutch exam at level ${level}.`,
    'Never copy tasks from official or published exams; invent realistic situations set in the Netherlands.',
    LEVEL_GUIDE[level],
    WRITING_GUIDE[level],
    'Write the situation and task in Dutch at the target level, addressing the candidate as "u".',
    'Reply with JSON only: {"situation": string, "task": string, "contentPoints": string[]}.',
    'contentPoints lists, in Dutch, the 2 to 4 things the text must contain.',
  ].join('\n')
  const user = [
    `Topic: ${adaptation.topic}.`,
    `Focus: ${FOCUS_GUIDE[adaptation.focus]}`,
    `Difficulty: ${DIFFICULTY_GUIDE[adaptation.difficulty]}`,
    recentTasks.length ? `Do not repeat these recent tasks:\n- ${recentTasks.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function parseWritingTask(raw: unknown, level: Level, topic: string, id: string): WritingTask {
  const o = (raw ?? {}) as Record<string, unknown>
  const points = Array.isArray(o.contentPoints)
    ? o.contentPoints.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : []
  if (points.length === 0) throw new Error('Generated task is missing "contentPoints".')
  const [minWords, maxWords] = WORD_RANGE[level]
  return {
    id,
    level,
    topic,
    situation: str(o.situation, 'situation'),
    task: str(o.task, 'task'),
    contentPoints: points.map((p) => p.trim()),
    minWords,
    maxWords,
  }
}

export async function generateWritingTask(
  settings: LlmSettings,
  level: Level,
  adaptation: Adaptation,
  recentTasks: string[],
  fetchImpl?: typeof fetch,
): Promise<WritingTask> {
  const raw = await chatJson(settings, buildWritingTaskPrompt(level, adaptation, recentTasks), fetchImpl)
  return parseWritingTask(raw, level, adaptation.topic, newId(`${level}-w`))
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function buildWritingFeedbackPrompt(
  task: WritingTask,
  text: string,
  language: FeedbackLanguage,
): ChatMessage[] {
  const system = [
    `You are an experienced NT2 examiner and writing coach for the Dutch exam at level ${task.level}.`,
    LEVEL_GUIDE[task.level],
    ...EXAMINER_RULES,
    'The text was typed by the candidate: count spelling and punctuation errors under grammatica.',
    'An empty or nearly empty text scores 0 for inhoud.',
    ...feedbackFormat(language, `a complete text of ${task.minWords}-${task.maxWords} words at the target level.`),
  ].join('\n')
  const user = [
    `Situation: ${task.situation}`,
    `Task: ${task.task}`,
    `Content points: ${task.contentPoints.join('; ')}`,
    `Length: ${countWords(text)} words (asked: ${task.minWords}-${task.maxWords}).`,
    `Text: """${text.trim() || '(empty)'}"""`,
  ].join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export async function coachWriting(
  settings: LlmSettings,
  task: WritingTask,
  text: string,
  language: FeedbackLanguage,
  fetchImpl?: typeof fetch,
): Promise<Feedback> {
  return parseFeedback(await chatJson(settings, buildWritingFeedbackPrompt(task, text, language), fetchImpl))
}

// ── Reading, listening and KNM quizzes ──────────────────────────────────────

const QUIZ_GUIDE: Record<QuizSkill, string> = {
  lezen:
    'A reading exercise: one realistic everyday text (e.g. letter, notice, website, advert, article) ' +
    'with questions about its purpose, details, meaning and conclusions.',
  luisteren:
    'A listening exercise: the script of a realistic spoken fragment (a conversation between two people, ' +
    'a phone call, an announcement or a short radio item). Write it as natural spoken Dutch; for a ' +
    'conversation start each turn with the speaker name and a colon. It will be read aloud by a speech synthesizer. ' +
    'Also return "speakers": an object mapping each speaker name to "male" or "female".',
  knm:
    'A KNM exercise (Kennis van de Nederlandse Maatschappij): practical questions about how things work in the ' +
    'Netherlands. Only ask about stable, well-established facts and customs; avoid numbers that change yearly. ' +
    'Return an empty string for "text".',
}

const TEXT_LENGTH: Record<Level, string> = {
  A2: 'Text of 80-150 words in short, simple sentences.',
  B1: 'Text of 150-250 words.',
  B2: 'Text of 250-400 words with some abstract vocabulary.',
}

export function buildQuizPrompt(
  skill: QuizSkill,
  level: Level,
  adaptation: Adaptation,
  recentTitles: string[],
  language: FeedbackLanguage,
): ChatMessage[] {
  const lang = language === 'nl' ? 'simple Dutch' : 'English'
  const system = [
    `You write original ${skill === 'knm' ? 'KNM' : 'NT2'} practice exercises for Dutch learners at level ${level}.`,
    'Never copy material from official or published exams.',
    LEVEL_GUIDE[level],
    QUIZ_GUIDE[skill],
    skill === 'knm' ? 'Write the questions in Dutch at A2 level.' : TEXT_LENGTH[level],
    `Write ${skill === 'knm' ? 6 : 4} multiple-choice questions in Dutch, each with 3 or 4 options and exactly one correct answer.`,
    'Wrong options must be plausible but clearly wrong for someone who understood.',
    `Write each explanation in ${lang}.`,
    'Reply with JSON only: {"title": string, "text": string, "questions": [{"question": string, "options": string[], "answer": number, "explanation": string}]}.',
    'answer is the 0-based index of the correct option.',
  ].join('\n')
  const user = [
    `Topic: ${adaptation.topic}.`,
    `Difficulty: ${DIFFICULTY_GUIDE[adaptation.difficulty]}`,
    recentTitles.length ? `Do not repeat these recent exercises:\n- ${recentTitles.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function parseQuiz(raw: unknown, skill: QuizSkill, level: Level, topic: string, id: string): Quiz {
  const o = (raw ?? {}) as Record<string, unknown>
  const questions: QuizQuestion[] = (Array.isArray(o.questions) ? o.questions : [])
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .map((q) => ({
      question: String(q.question ?? '').trim(),
      options: (Array.isArray(q.options) ? q.options : []).map((x) => String(x).trim()).filter(Boolean),
      answer: Number(q.answer),
      explanation: String(q.explanation ?? ''),
    }))
    .filter(
      (q) =>
        q.question &&
        q.options.length >= 2 &&
        new Set(q.options).size === q.options.length &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.options.length,
    )
  if (questions.length === 0) throw new Error('The generated exercise has no valid questions.')
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  if (skill !== 'knm' && !text) throw new Error('The generated exercise is missing its text.')
  const speakers = Object.fromEntries(
    Object.entries((o.speakers ?? {}) as Record<string, unknown>).filter(([, g]) => g === 'male' || g === 'female'),
  ) as Quiz['speakers']
  return { id, skill, level, topic, title: str(o.title, 'title'), text, questions, speakers }
}

export async function generateQuiz(
  settings: LlmSettings,
  skill: QuizSkill,
  level: Level,
  adaptation: Adaptation,
  recentTitles: string[],
  language: FeedbackLanguage,
  fetchImpl?: typeof fetch,
): Promise<Quiz> {
  const raw = await chatJson(settings, buildQuizPrompt(skill, level, adaptation, recentTitles, language), fetchImpl)
  return parseQuiz(raw, skill, level, adaptation.topic, newId(`${level}-${skill}`))
}

/** Number of answers that match the correct option. Unanswered questions count as wrong. */
export function scoreQuiz(quiz: Quiz, answers: (number | null)[]): number {
  return quiz.questions.filter((q, i) => answers[i] === q.answer).length
}
