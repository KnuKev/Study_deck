import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS } from '../src/data.ts'
import { getPracticePool } from '../src/engine.ts'
import { getPastExamPool, PAST_EXAMS } from '../src/pastExams.ts'
import { getPracticePriority, hasLectureMaterial, hasRecommendedPaper, IN3050_EXAM_GUIDANCE } from '../src/examGuidance.ts'

test('recommended papers are the Fall finals, with complete originals available outside current scope', () => {
  assert.deepEqual(new Set(PAST_EXAMS.filter(paper => paper.recommended).map(paper => paper.id)), new Set(IN3050_EXAM_GUIDANCE.recommendedPapers.map(paper => paper.id)))
  const current = getPastExamPool(QUESTIONS, 'fall', true)
  const full = getPastExamPool(QUESTIONS, 'fall')
  assert.equal(current.length, 95)
  assert.equal(full.length, 106)
  assert(current.every(question => !question.historicalOnly && hasRecommendedPaper(question)))
  assert(!current.some(question => question.originalExam === 'trial-2025'))
  const philosophy = full.find(question => question.id === 'in3050-original-final-2025-1-av')!
  assert(philosophy)
  assert(!current.includes(philosophy))
  assert(!getPracticePool(QUESTIONS, 'IN3050', []).includes(philosophy))
  assert.equal(getPastExamPool(QUESTIONS, 'trial-2025').length, 35)
})

test('IN3050 mock practice uses multiple-choice items while ordinary practice retains true-or-false', () => {
  const mock = getPracticePool(QUESTIONS, 'IN3050', [], 'all', 'mixed', 'exam')
  assert(mock.length >= IN3050_EXAM_GUIDANCE.format.approximateQuestions)
  assert(mock.every(question => question.type !== 'boolean' && !question.unscored && !question.historicalOnly))
  assert(mock.some(question => question.type === 'multi'))
  assert(getPracticePool(QUESTIONS, 'IN3050', []).some(question => question.type === 'boolean'))
  assert.deepEqual(getPracticePool(QUESTIONS, 'IN3230', [], 'all', 'mixed', 'exam'), getPracticePool(QUESTIONS, 'IN3230', []))
})

test('exam prep includes lecture-based material and both Fall papers without promoting the trial', () => {
  const prep = getPracticePool(QUESTIONS, 'IN3050', [], 'all', 'prep')
  assert(prep.some(question => hasLectureMaterial(question) && !hasRecommendedPaper(question)))
  for (const year of [2024, 2025]) assert(prep.some(question => question.examYear === year))
  for (const topic of ['ai-evaluation-generalization', 'ai-regularization-ensembles', 'ai-unsupervised-learning']) {
    assert(prep.some(question => question.topicId === topic), topic)
  }
  const fall2024 = prep.find(question => question.examYear === 2024)!
  const fall2025 = prep.find(question => question.examYear === 2025)!
  const trial = getPastExamPool(QUESTIONS, 'trial-2025').find(question => !question.historicalOnly)!
  assert.equal(getPracticePriority(fall2024), getPracticePriority(fall2025))
  assert(getPracticePriority(fall2024) > getPracticePriority(trial))
  // A year flag cannot turn an unrelated Spring paper into a format reference.
  const spring = { ...fall2025, sourceRefs: [{ path: 'IN3050/old_exams/spring-2025.pdf', location: 'Question 1' }] }
  assert.equal(hasRecommendedPaper(spring), false)
  assert.equal(getPracticePriority(spring), 1)
  assert.equal(IN3050_EXAM_GUIDANCE.pendingMaterial.name, 'exam_walkthrough_30min')
})
