import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../src/data.ts'
import { createHash } from 'node:crypto'
import optionFixtures from './fixtures/past-exam-options.json' with { type: 'json' }
import { createSession } from '../src/engine.ts'
import { getPastExamPool, PAST_EXAMS } from '../src/pastExams.ts'

test('exam selection returns only registered items from the chosen paper', () => {
  const counts = { 'final-2024': 50, 'final-2025': 56, 'trial-2025': 35 } as const
  for (const exam of PAST_EXAMS) {
    const pool = getPastExamPool(QUESTIONS, exam.id)
    assert.equal(pool.length, counts[exam.id], exam.id)
    assert(pool.every(question => question.sourceRefs?.some(reference => reference.path === exam.path)))
    assert(pool.every(question => !question.examPrep && !question.writtenAdaptation && !question.isDemo))
    const session = createSession({ courseId: 'IN3050', mode: 'exam', questionIds: pool.map(question => question.id), durationMinutes: null })
    assert.deepEqual(new Set(session.questionIds), new Set(pool.map(question => question.id)))
  }
})

test('combined exams keep paper-specific versions and exclude generated or converted questions', () => {
  const pool = getPastExamPool(QUESTIONS, 'all')
  const combined = new Set(PAST_EXAMS.flatMap(exam => getPastExamPool(QUESTIONS, exam.id).map(question => question.id)))
  assert.equal(pool.length, 141)
  assert.equal(new Set(pool.map(question => question.id)).size, pool.length)
  assert.deepEqual(new Set(pool.map(question => question.id)), combined)
  const original = getPastExamPool(QUESTIONS, 'final-2025')[0]!
  const candidates = [
    { ...original, id: 'generated', examPrep: true },
    { ...original, id: 'converted-written', writtenAdaptation: true },
    { ...original, id: 'unverified-reference', sourceRefs: [] },
    { ...original, id: 'retired', retired: true },
    { ...original, id: 'adapted', originalExam: undefined },
  ]
  assert.deepEqual(getPastExamPool(candidates, 'all'), [])
})

test('original options match the reviewed source transcription, including duplicate choices', async () => {
  const { getOrderedOptions } = await import('../src/engine.ts')
  const pool = getPastExamPool(QUESTIONS, 'all')
  assert.equal(optionFixtures.length, pool.length)
  for (const fixture of optionFixtures) {
    const question = pool.find(item => item.id === fixture.id)!
    assert(question, fixture.id)
    assert.equal(question.originalExam, fixture.paper)
    const texts = question.options.map(option => option.text)
    assert.equal(createHash('sha256').update(JSON.stringify(texts)).digest('hex'), fixture.optionsSha256, fixture.id)
    assert.deepEqual(getOrderedOptions(question, 'session-a'), question.options)
    assert.deepEqual(getOrderedOptions(question, 'session-b'), question.options)
  }
  const pmx = pool.find(question => question.id === 'in3050-original-final-2024-26')!
  assert.equal(pmx.options.length, 8)
  assert.equal(pmx.options[2]!.text, pmx.options[4]!.text)
  assert.equal(pmx.correctOptionId, 'b,f')
})
