import type { Deck, DeckId, DeckQuestion, Question } from './model.ts'

const STORAGE_KEY = 'study-deck.custom-decks.v1'
const idPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i

export const MAX_QUESTIONS = 250
export const MAX_OPTIONS = 6
export const MAX_DECK_FILE_BYTES = 1_000_000
export const limits = { title: 100, prompt: 2000, option: 500, explanation: 2000 }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isDeckId(value: unknown): value is DeckId {
  return typeof value === 'string' && value.startsWith('deck-') && idPattern.test(value.slice(5))
}

function readText(value: unknown, limit: number, error: string, required = true) {
  if (typeof value !== 'string' || value.trim().length > limit || (required && !value.trim())) throw new Error(error)
  return value.trim()
}

function readQuestion(value: unknown, id: string, index: number): DeckQuestion {
  const label = `Question ${index + 1}`
  if (!isObject(value)) throw new Error(`${label} is invalid.`)
  const prompt = readText(value.prompt, limits.prompt, `${label} needs a prompt of up to ${limits.prompt} characters.`)
  if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > MAX_OPTIONS) {
    throw new Error(`${label} needs 2–${MAX_OPTIONS} answer options.`)
  }
  const options = value.options.map(option => readText(option, limits.option, `${label} needs text in every answer option.`))
  if (new Set(options).size !== options.length) throw new Error(`${label} has duplicate answers.`)
  const { correctIndex } = value
  if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    throw new Error(`${label} needs one correct answer.`)
  }
  const explanation = readText(value.explanation === undefined ? '' : value.explanation, limits.explanation, `${label} has an invalid explanation.`, false)
  return { id, prompt, options, correctIndex, explanation }
}

function readDeck(value: unknown, newIds: boolean): Deck {
  if (!isObject(value)) throw new Error('Expected a deck object.')
  const id = newIds ? `deck-${crypto.randomUUID()}` as const : value.id
  if (!isDeckId(id)) throw new Error('Invalid deck ID.')
  const title = readText(value.title, limits.title, `Enter a deck name of up to ${limits.title} characters.`)
  if (!Array.isArray(value.questions) || !value.questions.length || value.questions.length > MAX_QUESTIONS) {
    throw new Error(`A deck needs 1–${MAX_QUESTIONS} questions.`)
  }
  const seen = new Set<string>()
  const questions = value.questions.map((question, index) => {
    const questionId = newIds ? crypto.randomUUID() : isObject(question) ? question.id : undefined
    if (typeof questionId !== 'string' || !idPattern.test(questionId) || seen.has(questionId)) throw new Error('Invalid question ID.')
    seen.add(questionId)
    return readQuestion(question, questionId, index)
  })
  return { id, title, questions }
}

export function validateDeck(value: unknown): Deck {
  return readDeck(value, false)
}

export function serializeDeck(deck: Deck) {
  const questions = deck.questions.map(({ prompt, options, correctIndex, explanation }) => ({ prompt, options, correctIndex, explanation }))
  return JSON.stringify({ format: 'study-deck', version: 1, title: deck.title, questions }, null, 2)
}

export function parseDeckFile(text: string): Deck {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  if (!isObject(value) || value.format !== 'study-deck' || value.version !== 1) {
    throw new Error('Choose a version 1 Study Deck JSON file.')
  }
  const deck = readDeck(value, true)
  if (new TextEncoder().encode(serializeDeck(deck)).length > MAX_DECK_FILE_BYTES) {
    throw new Error('This deck is too large to export again. Split it into smaller decks.')
  }
  return deck
}

export function deckQuestions(deck: Deck): Question[] {
  return deck.questions.map(question => ({
    id: question.id,
    courseId: deck.id,
    topicId: deck.id,
    type: 'choice',
    prompt: question.prompt,
    options: question.options.map((text, index) => ({ id: String(index), text })),
    correctOptionId: String(question.correctIndex),
    explanation: question.explanation,
    source: '',
    difficulty: 'medium',
  }))
}

export function loadDecks(): Deck[] {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return []
    const values: unknown = JSON.parse(text)
    if (!Array.isArray(values)) return []
    return values.flatMap(value => {
      try { return [validateDeck(value)] } catch { return [] }
    })
  } catch { return [] }
}

export function saveDecks(decks: Deck[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
    return true
  } catch { return false }
}
