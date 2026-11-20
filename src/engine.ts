import type { StudySetId, Difficulty, EndReason, ExamYear, Question, Session, SessionMode, SessionSummary } from './model.ts'
import { isIN3050ExamPreparation } from './examGuidance.ts'

export type QuestionFocus = 'mixed' | 'prep' | 'illustrations' | 'trial-2025' | ExamYear

export function getPracticePool(questions: readonly Question[], courseId: StudySetId, topicIds: readonly string[], difficulty: Difficulty | 'all' = 'all', focus: QuestionFocus = 'mixed', mode: SessionMode = 'practice') {
  const topics = new Set(topicIds)
  return questions.filter(question => {
    if (question.isDemo || question.retired || question.courseId !== courseId) return false
    if (focus === 'trial-2025') return Boolean(question.trial2025)
    if (typeof focus === 'number') return question.examYear === focus
    if (question.historicalOnly || (topics.size && !topics.has(question.topicId))) return false
    if (difficulty !== 'all' && question.difficulty !== difficulty) return false
    if (courseId === 'IN3050' && mode === 'exam' && (question.type === 'boolean' || question.unscored)) return false
    if (focus === 'illustrations') return Boolean(question.illustrations?.some(image => image.placement === 'question'))
    return focus === 'mixed' || (courseId === 'IN3050' ? isIN3050ExamPreparation(question) : Boolean(question.examPrep || question.examYear || question.trial2025))
  })
}

/** Stable per session, including after reload; prevents learning an answer's letter. */
export function getOrderedOptions(question: Question, sessionId: string) {
  const options = [...question.options]
  if (question.type === 'boolean' || question.originalExam || question.instructorOriginal) return options
  let seed = 2166136261
  for (const character of `${sessionId}:${question.id}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  for (let i = options.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = Math.floor(seed / 4294967296 * (i + 1))
    ;[options[i], options[j]] = [options[j]!, options[i]!]
  }
  return options
}

export function answerIds(answer?: string): string[] {
  return answer ? answer.split(',') : []
}

export function requiredAnswerCount(question: Question): number {
  return question.type === 'multi' ? answerIds(question.correctOptionId).length : 1
}

export function isValidAnswer(question: Question, answer: string): boolean {
  const ids = answerIds(answer)
  return ids.length === requiredAnswerCount(question)
    && new Set(ids).size === ids.length
    && ids.every(id => question.options.some(option => option.id === id))
}

export function filterQuestions(questions: readonly Question[], courseId: StudySetId, topicIds: readonly string[]) {
  const selected = new Set(topicIds)
  return questions.filter(question => question.courseId === courseId && selected.has(question.topicId))
}

export function createSession(input: { courseId: StudySetId; mode: SessionMode; questionIds: string[]; durationMinutes: number | null; priority?: ReadonlyMap<string, number> }, now = Date.now()): Session {
  const questionIds = [...new Set(input.questionIds)]
  if (!questionIds.length || questionIds.some(id => typeof id !== 'string' || !id)) throw new Error('Choose at least one question.')
  if (!Number.isFinite(now) || now < 0) throw new Error('Invalid start time.')
  if (input.durationMinutes !== null && (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0 || input.durationMinutes > 1440)) throw new Error('Invalid session duration.')
  // Independent exponential draws rank questions without replacement. Higher weights
  // make a question more likely to appear early when the list is cut to session size.
  const rankedIds = questionIds.map(id => ({
    id,
    draw: -Math.log(1 - Math.random()) / (input.priority?.get(id) ?? 1),
  })).sort((a, b) => a.draw - b.draw).map(({ id }) => id)
  return { id: crypto.randomUUID(), courseId: input.courseId, mode: input.mode, questionIds: rankedIds, answers: {}, currentIndex: 0, startedAt: now, deadline: input.durationMinutes === null ? null : now + input.durationMinutes * 60_000, finishedAt: null, endReason: null }
}

export function getRemainingSeconds(session: Session, now = Date.now()): number | null {
  if (session.deadline === null) return null
  return Math.max(0, Math.ceil((session.deadline - (session.finishedAt ?? now)) / 1000))
}

export function finishSession(session: Session, reason: EndReason, now = Date.now()): Session {
  if (session.finishedAt !== null) return session
  const expired = session.deadline !== null && now >= session.deadline
  return { ...session, finishedAt: Math.max(session.startedAt, expired ? session.deadline! : now), endReason: expired ? 'timeout' : reason }
}

export function answerQuestion(session: Session, questionId: string, optionId: string, questions: readonly Question[], now = Date.now()): Session {
  if (session.finishedAt !== null) return session
  if (session.deadline !== null && now >= session.deadline) return finishSession(session, 'timeout', now)
  const question = questions.find(candidate => candidate.id === questionId)
  if (!session.questionIds.includes(questionId) || !question || question.courseId !== session.courseId || !isValidAnswer(question, optionId)) throw new Error('Invalid answer.')
  if (Object.hasOwn(session.answers, questionId)) return session
  return { ...session, answers: { ...session.answers, [questionId]: answerIds(optionId).sort().join(',') } }
}

export function summarizeSession(session: Session, questions: readonly Question[], now = Date.now()): SessionSummary {
  const index = new Map(questions.map(question => [question.id, question]))
  const topics = new Map<string, { topicId: string; correct: number; answered: number; total: number }>()
  let correct = 0
  let answered = 0
  let unscored = 0
  for (const id of session.questionIds) {
    const question = index.get(id)
    if (!question) continue
    if (question.unscored) { unscored++; continue }
    let topic = topics.get(question.topicId)
    if (!topic) { topic = { topicId: question.topicId, correct: 0, answered: 0, total: 0 }; topics.set(question.topicId, topic) }
    topic.total++
    if (Object.hasOwn(session.answers, id)) {
      answered++; topic.answered++
      if (session.answers[id] === question.correctOptionId) { correct++; topic.correct++ }
    }
  }
  const total = session.questionIds.length - unscored
  const end = Math.min(session.finishedAt ?? now, session.deadline ?? Infinity)
  return { correct, answered, total, unscored, percentage: total ? Math.round(correct / total * 100) : 0, elapsedSeconds: Math.max(0, Math.floor((end - session.startedAt) / 1000)), topics: [...topics.values()] }
}
