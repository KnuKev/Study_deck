import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_QUESTIONS, COURSES, QUESTIONS, SOURCE_INDEX } from '../src/data.ts'
import { getOrderedOptions, getPracticePool } from '../src/engine.ts'

test('curriculum questions have distinct identities, real topics and exactly one answer', () => {
  assert.equal(new Set(ALL_QUESTIONS.map(question => question.id)).size, ALL_QUESTIONS.length)
  const prompts = new Set<string>()
  for (const question of QUESTIONS) {
    assert(COURSES.find(course => course.id === question.courseId)?.topics.some(topic => topic.id === question.topicId), question.id)
    assert(!question.isDemo, question.id)
    assert(['easy', 'medium', 'hard'].includes(question.difficulty), question.id)
    assert.equal(question.options.filter(option => option.id === question.correctOptionId).length, 1, question.id)
    assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length, question.id)
    assert.equal(new Set(question.options.map(option => option.text.trim().toLowerCase())).size, question.options.length, question.id)
    assert(question.options.every(option => option.id && option.text.trim()), question.id)
    assert(question.prompt.trim().length > 10 && question.explanation.trim().length > 20, question.id)
    assert.equal(question.options.length, question.type === 'boolean' ? 2 : 4, question.id)
    const prompt = `${question.courseId}:${question.prompt.trim().toLowerCase()}`
    assert(!prompts.has(prompt), `Repeated question: ${question.id}`)
    prompts.add(prompt)
    if (question.table) {
      assert(question.table.caption && question.table.columns.length > 1, question.id)
      assert(question.table.rows.every(row => row.length === question.table!.columns.length), question.id)
    }
  }
})

test('every topic offers a useful range of difficulty and documented learning objectives', () => {
  const ids = COURSES.flatMap(course => course.topics.map(topic => topic.id))
  assert.equal(new Set(ids).size, ids.length)
  for (const course of COURSES) {
    assert(QUESTIONS.filter(question => question.courseId === course.id).length >= 50)
    for (const topic of course.topics) {
      const questions = QUESTIONS.filter(question => question.topicId === topic.id)
      assert(questions.length >= 5, topic.id)
      assert(questions.some(question => question.difficulty === 'easy'), topic.id)
      assert(questions.some(question => question.difficulty === 'hard'), topic.id)
      assert((topic.objectives?.length ?? 0) >= 2, topic.id)
      assert(topic.sourcePaths?.length, topic.id)
      for (const path of topic.sourcePaths!) assert(SOURCE_INDEX.has(path), `${topic.id}: ${path}`)
    }
  }
})

test('all questions identify a real supplied source and a concrete location', () => {
  for (const question of QUESTIONS) {
    assert(question.sourceRefs?.length, question.id)
    for (const reference of question.sourceRefs!) {
      const source = SOURCE_INDEX.get(reference.path)
      assert(source, `${question.id}: ${reference.path}`)
      assert.equal(source.courseId, question.courseId, question.id)
      assert(reference.location.trim().length >= 3, question.id)
      assert(!reference.path.startsWith('/') && !reference.path.split('/').includes('..'), question.id)
      assert.match(source.sha256, /^[a-f0-9]{64}$/, question.id)
    }
  }
})

test('practice selection combines course, topic and difficulty without old demo questions', () => {
  const first = QUESTIONS.find(question => question.difficulty === 'hard')!
  const selected = getPracticePool(ALL_QUESTIONS, first.courseId, [first.topicId], 'hard')
  assert(selected.length > 0)
  assert(selected.every(question => !question.isDemo && question.courseId === first.courseId && question.topicId === first.topicId && question.difficulty === 'hard'))
  assert.equal(getPracticePool(ALL_QUESTIONS, 'IN3050', []).length, QUESTIONS.filter(question => question.courseId === 'IN3050').length)
  assert.deepEqual(getPracticePool(ALL_QUESTIONS, 'IN3050', ['missing-topic']), [])
})

test('choice order is stable on reload and varies between sessions without changing answer IDs', () => {
  const question = QUESTIONS.find(question => question.type === 'choice')!
  const before = JSON.stringify(question)
  assert.deepEqual(getOrderedOptions(question, 'session-a'), getOrderedOptions(question, 'session-a'))
  const orders = new Set(Array.from({ length: 15 }, (_, index) => getOrderedOptions(question, `session-${index}`).map(option => option.id).join(',')))
  assert(orders.size > 1)
  for (const id of ['a', 'b', 'c']) {
    const options = getOrderedOptions(question, id)
    assert.deepEqual(new Set(options.map(option => option.id)), new Set(question.options.map(option => option.id)))
    assert.equal(options.filter(option => option.id === question.correctOptionId).length, 1)
  }
  assert.equal(JSON.stringify(question), before)
  const boolean = QUESTIONS.find(question => question.type === 'boolean')!
  assert.deepEqual(getOrderedOptions(boolean, 'a'), boolean.options)
})
