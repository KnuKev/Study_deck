import test from 'node:test'
import assert from 'node:assert/strict'
import { deckQuestions, loadDecks, parseDeckFile, saveDecks, serializeDeck } from '../src/decks.ts'
import { answerQuestion, createSession, finishSession, summarizeSession } from '../src/engine.ts'
import { loadProgress, saveProgress } from '../src/storage.ts'

const portable = {
  format: 'study-deck',
  version: 1,
  title: 'Biology',
  questions: [{ prompt: 'Which structure contains DNA?', options: ['Nucleus', 'Cell membrane'], correctIndex: 0, explanation: 'The nucleus contains most of the cell’s DNA.' }],
}

test('a portable deck round-trips with fresh IDs and intact answers', () => {
  const deck = parseDeckFile(JSON.stringify(portable))
  assert.deepEqual(JSON.parse(serializeDeck(deck)), portable)
  const copy = parseDeckFile(serializeDeck(deck))
  assert.notEqual(copy.id, deck.id)
  assert.notEqual(copy.questions[0]!.id, deck.questions[0]!.id)
  assert.equal(copy.questions[0]!.correctIndex, 0)
  assert.throws(() => parseDeckFile(JSON.stringify({ ...portable, version: 2 })), /version 1/)
  assert.throws(() => parseDeckFile(JSON.stringify({ ...portable, questions: [{ ...portable.questions[0], correctIndex: 2 }] })), /correct answer/)
})

test('reloading a custom session uses its original answer key after the source deck changes or is deleted', () => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } })
  const deck = parseDeckFile(JSON.stringify(portable))
  assert(saveDecks([deck]))
  assert.deepEqual(loadDecks(), [deck])
  const bank = deckQuestions(deck)
  const question = bank[0]!
  const session = { ...createSession({ courseId: deck.id, mode: 'practice', questionIds: [question.id], durationMinutes: null }, 1_000), deck }
  const active = answerQuestion(session, question.id, '0', bank, 2_000)
  assert(saveProgress({ active, history: [] }))
  assert.deepEqual(loadProgress([]).active, active)
  const finished = finishSession(active, 'completed', 3_000)
  assert(saveProgress({ active: null, history: [finished] }))
  assert(saveDecks([]))
  assert.deepEqual(loadDecks(), [])
  const restored = loadProgress([]).history[0]!
  assert.deepEqual(restored, finished)
  assert.equal(summarizeSession(restored, deckQuestions(restored.deck!)).percentage, 100)
})
