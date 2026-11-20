import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../src/data.ts'
import { answerQuestion, createSession, filterQuestions, finishSession, getRemainingSeconds, summarizeSession } from '../src/engine.ts'

const first = QUESTIONS.find(question => question.courseId === 'IN3050')!
const second = QUESTIONS.find(question => question.courseId === 'IN3050' && question.id !== first.id)!
const create = () => createSession({ courseId: 'IN3050', mode: 'practice', questionIds: [first.id, second.id], durationMinutes: 15 }, 1_000)

test('course/topic filters exclude other courses and an empty selection selects nothing', () => {
  const topicIds = [...new Set(QUESTIONS.filter(question => question.courseId === 'IN3230').map(question => question.topicId))].slice(0, 2)
  const selected = filterQuestions(QUESTIONS, 'IN3230', topicIds)
  assert(selected.length > 0)
  assert(selected.every(question => question.courseId === 'IN3230' && topicIds.includes(question.topicId)))
  assert.deepEqual(filterQuestions(QUESTIONS, 'IN3050', []), [])
})

test('session creation copies and deduplicates selection without mutating its source', () => {
  const questionIds = [first.id, second.id, first.id]
  const session = createSession({ courseId: 'IN3050', mode: 'exam', questionIds, durationMinutes: null }, 1_000)
  assert.deepEqual(questionIds, [first.id, second.id, first.id])
  assert.equal(session.questionIds.length, 2)
  assert.deepEqual(new Set(session.questionIds), new Set([first.id, second.id]))
  assert.equal(session.deadline, null)
  assert.equal(getRemainingSeconds(session, 999_999), null)
  assert.throws(() => createSession({ courseId: 'IN3050', mode: 'exam', questionIds: [], durationMinutes: 15 }))
  assert.throws(() => createSession({ courseId: 'IN3050', mode: 'exam', questionIds, durationMinutes: -1 }))
})

test('a submitted answer is immutable and cannot be replaced after revealing the explanation', () => {
  const initial = create()
  const answered = answerQuestion(initial, first.id, first.correctOptionId, QUESTIONS, 5_000)
  assert.deepEqual(initial.answers, {})
  assert.equal(answered.answers[first.id], first.correctOptionId)
  const wrong = first.options.find(option => option.id !== first.correctOptionId)!.id
  assert.equal(answerQuestion(answered, first.id, wrong, QUESTIONS, 6_000), answered)
  assert.throws(() => answerQuestion(initial, 'unknown', '0', QUESTIONS, 5_000))
  assert.throws(() => answerQuestion(initial, first.id, 'invalid-option', QUESTIONS, 5_000))
})

test('elapsed wall time expires a session even if no timer ticks ran while the tab was closed', () => {
  const initial = create()
  assert.equal(getRemainingSeconds(initial, 1_000), 900)
  assert.equal(getRemainingSeconds(initial, 900_999), 1)
  assert.equal(getRemainingSeconds(initial, 901_000), 0)
  const expired = answerQuestion(initial, first.id, first.correctOptionId, QUESTIONS, 999_000)
  assert.equal(expired.endReason, 'timeout')
  assert.equal(expired.finishedAt, initial.deadline)
  assert.deepEqual(expired.answers, {})
  assert.equal(summarizeSession(expired, QUESTIONS).elapsedSeconds, 900)
})

test('score counts unanswered questions and finishing is idempotent', () => {
  const initial = create()
  const answered = answerQuestion(initial, first.id, first.correctOptionId, QUESTIONS, 5_000)
  const finished = finishSession(answered, 'manual', 20_000)
  assert.equal(finishSession(finished, 'timeout', 999_000), finished)
  assert.equal(answerQuestion(finished, second.id, second.correctOptionId, QUESTIONS, 25_000), finished)
  const summary = summarizeSession(finished, QUESTIONS)
  assert.equal(summary.correct, 1)
  assert.equal(summary.answered, 1)
  assert.equal(summary.total, 2)
  assert.equal(summary.percentage, 50)
  assert.equal(summary.elapsedSeconds, 19)
  assert.equal(summary.topics.reduce((total, topic) => total + topic.total, 0), 2)
})

test('broken source items remain answerable but do not change scores or topic totals', () => {
  const broken = QUESTIONS.find(question => question.unscored)!
  const session = createSession({ courseId: 'IN3050', mode: 'practice', questionIds: [first.id, broken.id], durationMinutes: null }, 1000)
  const correct = answerQuestion(session, first.id, first.correctOptionId, QUESTIONS, 1500)
  const answered = answerQuestion(correct, broken.id, broken.options[0]!.id, QUESTIONS, 2000)
  for (const attempt of [correct, answered]) {
    const summary = summarizeSession(attempt, QUESTIONS, 2500)
    assert.equal(summary.total, 1)
    assert.equal(summary.unscored, 1)
    assert.equal(summary.correct, 1)
    assert.equal(summary.answered, 1)
    assert.equal(summary.percentage, 100)
    assert.equal(summary.topics.reduce((sum, topic) => sum + topic.total, 0), 1)
  }
  const onlyBroken = createSession({ courseId: 'IN3050', mode: 'exam', questionIds: [broken.id], durationMinutes: null }, 1000)
  assert.equal(summarizeSession(onlyBroken, QUESTIONS, 2000).total, 0)
})
