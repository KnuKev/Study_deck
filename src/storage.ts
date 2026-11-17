import { deckQuestions, isDeckId, validateDeck } from './decks.ts'
import type { Deck, Progress, Question, Session } from './model.ts'

export const STORAGE_KEY = 'exam-quizer.progress.v1'
const empty = (): Progress => ({ active: null, history: [] })
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 8.64e15

function validateSession(value: unknown, questions: readonly Question[]): Session | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id || value.id.length > 100 || !['practice', 'exam'].includes(String(value.mode))) return null
  let deck: Deck | undefined
  if (isDeckId(value.courseId)) {
    try { deck = validateDeck(value.deck) } catch { return null }
    if (deck.id !== value.courseId) return null
    questions = deckQuestions(deck)
  } else if (value.courseId !== 'IN3050' && value.courseId !== 'IN3230') {
    return null
  }
  const ids = value.questionIds
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || !ids.every(id => typeof id === 'string') || new Set(ids).size !== ids.length) return null
  const index = new Map(questions.map(question => [question.id, question]))
  if (ids.some(id => !index.has(id) || index.get(id)!.courseId !== value.courseId)) return null
  if (!isObject(value.answers)) return null
  for (const [id, answer] of Object.entries(value.answers)) if (!ids.includes(id) || typeof answer !== 'string' || !index.get(id)?.options.some(option => option.id === answer)) return null
  if (typeof value.currentIndex !== 'number' || !Number.isInteger(value.currentIndex) || value.currentIndex < 0 || value.currentIndex >= ids.length || !isTime(value.startedAt)) return null
  if (value.deadline !== null && (!isTime(value.deadline) || value.deadline <= value.startedAt || value.deadline - value.startedAt > 86_400_000)) return null
  if (value.finishedAt !== null && (!isTime(value.finishedAt) || value.finishedAt < value.startedAt || (value.deadline !== null && value.finishedAt > value.deadline))) return null
  if (value.finishedAt === null ? value.endReason !== null : !['completed', 'manual', 'timeout'].includes(String(value.endReason))) return null
  return { id: value.id, courseId: value.courseId as Session['courseId'], mode: value.mode as Session['mode'], questionIds: [...ids], answers: { ...value.answers } as Record<string, string>, currentIndex: value.currentIndex, startedAt: value.startedAt, deadline: value.deadline as number | null, finishedAt: value.finishedAt as number | null, endReason: value.endReason as Session['endReason'], ...(deck ? { deck } : {}) }
}

export function loadProgress(questions: readonly Question[]): Progress {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return empty()
    const parsed: unknown = JSON.parse(text)
    if (!isObject(parsed) || parsed.version !== 1 || !Array.isArray(parsed.history)) return empty()
    const candidate = validateSession(parsed.active, questions)
    const active = candidate?.finishedAt === null ? candidate : null
    const seen = new Set<string>()
    const history = parsed.history.slice(0, 100).flatMap(value => {
      const session = validateSession(value, questions)
      if (!session || session.finishedAt === null || seen.has(session.id) || session.id === active?.id) return []
      seen.add(session.id)
      return [session]
    })
    return { active, history }
  } catch { return empty() }
}

export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, active: progress.active, history: progress.history.slice(0, 100) }))
    return true
  } catch { return false }
}
