import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../src/data.ts'
import { answerQuestion, createSession, finishSession } from '../src/engine.ts'
import { loadProgress, saveProgress, STORAGE_KEY } from '../src/storage.ts'

function useStorage() {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } })
  return values
}
const first = QUESTIONS[0]!
const create = () => createSession({ courseId: 'IN3050', mode: 'practice', questionIds: [first.id], durationMinutes: 15 }, 1_000)

test('an in-progress session survives a reload with the original deadline and answer', () => {
  useStorage()
  const active = answerQuestion(create(), first.id, first.correctOptionId, QUESTIONS, 2_000)
  assert.equal(saveProgress({ active, history: [] }), true)
  assert.deepEqual(loadProgress(QUESTIONS), { active, history: [] })
})

test('malformed storage, unknown questions and invalid options do not crash or restore invalid attempts', () => {
  const values = useStorage()
  for (const raw of ['{broken', 'null', '[]', '{"version":999,"history":[]}']) {
    values.set(STORAGE_KEY, raw)
    assert.deepEqual(loadProgress(QUESTIONS), { active: null, history: [] })
  }
  const valid = finishSession(create(), 'manual', 5_000)
  const invalidStates = [
    { ...create(), questionIds: ['removed-from-bank'] },
    { ...create(), answers: { [first.id]: 'missing-option' } },
    { ...create(), courseId: 'IN3230' },
    { ...create(), currentIndex: 9 },
    { ...create(), deadline: 0 },
    { ...create(), finishedAt: 0 },
  ]
  for (const active of invalidStates) {
    values.set(STORAGE_KEY, JSON.stringify({ version: 1, active, history: [valid] }))
    assert.deepEqual(loadProgress(QUESTIONS), { active: null, history: [valid] })
  }
})

test('history removes duplicate IDs and never loads unfinished sessions as results', () => {
  const values = useStorage()
  const active = create()
  const finished = finishSession(create(), 'manual', 5_000)
  values.set(STORAGE_KEY, JSON.stringify({ version: 1, active, history: [finished, finished, active] }))
  assert.deepEqual(loadProgress(QUESTIONS), { active, history: [finished] })
})

test('history stays bounded, and unavailable storage degrades without crashing', () => {
  useStorage()
  const history = Array.from({ length: 120 }, () => finishSession(create(), 'manual', 2_000))
  assert.equal(saveProgress({ active: null, history }), true)
  assert.equal(loadProgress(QUESTIONS).history.length, 100)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked') } })
  assert.equal(saveProgress({ active: null, history: [] }), false)
  assert.deepEqual(loadProgress(QUESTIONS), { active: null, history: [] })
})

// Keep the first version's saved attempts readable after replacing demo content.
test('old demo sessions remain available alongside the curriculum bank', async () => {
  const { ALL_QUESTIONS } = await import('../src/data.ts')
  useStorage()
  const old = ALL_QUESTIONS.find(question => question.isDemo)!
  const draft = createSession({ courseId: old.courseId, mode: 'practice', questionIds: [old.id], durationMinutes: null }, 1_000)
  const answered = answerQuestion(draft, old.id, old.correctOptionId, ALL_QUESTIONS, 2_000)
  const history = [finishSession(answered, 'completed', 3_000)]
  saveProgress({ active: null, history })
  assert.deepEqual(loadProgress(ALL_QUESTIONS).history, history)
})
