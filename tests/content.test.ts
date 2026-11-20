import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL_QUESTIONS, COURSES, QUESTIONS, SOURCE_INDEX } from '../src/data.ts'
import { getOrderedOptions, getPracticePool, isValidAnswer } from '../src/engine.ts'

test('curriculum questions have distinct identities, real topics and valid answer keys', () => {
  assert.equal(new Set(ALL_QUESTIONS.map(question => question.id)).size, ALL_QUESTIONS.length)
  const prompts = new Set<string>()
  for (const question of QUESTIONS) {
    assert(COURSES.find(course => course.id === question.courseId)?.topics.some(topic => topic.id === question.topicId), question.id)
    assert(!question.isDemo, question.id)
    assert(['easy', 'medium', 'hard'].includes(question.difficulty), question.id)
    assert(isValidAnswer(question, question.correctOptionId), question.id)
    const ids = question.correctOptionId.split(',')
    assert.deepEqual(ids, [...ids].sort(), question.id)
    assert.equal(ids.length > 1, question.type === 'multi', question.id)
    assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length, question.id)
    // Source papers contain duplicate options; authored questions must not.
    if (!question.originalExam) assert.equal(new Set(question.options.map(option => option.text.trim().toLowerCase())).size, question.options.length, question.id)
    assert(question.options.every(option => option.id && option.text.trim()), question.id)
    assert(question.prompt.trim().length > 10 && question.explanation.trim().length > 20, question.id)
    if (question.type === 'boolean') assert.equal(question.options.length, 2, question.id)
    else assert(question.options.length >= 4 && question.options.length <= 8, question.id)
    const prompt = `${question.courseId}:${question.originalExam ?? 'authored'}:${question.prompt.trim().toLowerCase()}`
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
      const availableForMixedPractice = questions.some(question => !question.historicalOnly)
      assert(questions.length >= (availableForMixedPractice ? 5 : 1), topic.id)
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
  assert.equal(getPracticePool(ALL_QUESTIONS, 'IN3050', []).length, QUESTIONS.filter(question => question.courseId === 'IN3050' && !question.historicalOnly).length)
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

test('authored answers do not concentrate in the uniquely longest option', () => {
  for (const course of COURSES) {
    const questions = QUESTIONS.filter(question => question.courseId === course.id && !question.originalExam && question.type === 'choice' && !question.codeOptions)
    let unique = 0, correctLongest = 0
    for (const question of questions) {
      const lengths = question.options.map(option => option.text.length)
      const maximum = Math.max(...lengths)
      if (lengths.filter(length => length === maximum).length !== 1) continue
      unique++
      if (question.options[lengths.indexOf(maximum)]!.id === question.correctOptionId) correctLongest++
    }
    assert(unique > 100, course.id)
    assert(correctLongest / unique <= .35, `${course.id}: ${correctLongest}/${unique} uniquely longest choices are correct`)
  }
})


test('full papers contain all original items while focused practice uses only relevant recent material', () => {
  for (const [year, expected] of [[2024, 50], [2025, 56]] as const) {
    const paper = getPracticePool(ALL_QUESTIONS, 'IN3050', ['missing-topic'], 'hard', year)
    assert.equal(paper.length, expected)
    assert.equal(new Set(paper.map(question => question.sourceRefs?.[0]?.location)).size, expected)
    assert(paper.every(question => question.examYear === year))
    assert(paper.some(question => question.historicalOnly))
  }
  const aiPrep = getPracticePool(ALL_QUESTIONS, 'IN3050', [], 'all', 'prep')
  assert(aiPrep.every(question => !question.historicalOnly && (question.examPrep || question.examYear || question.trial2025)))
  assert(aiPrep.some(question => question.examPrep && question.code))
  const networkingPrep = getPracticePool(ALL_QUESTIONS, 'IN3230', [], 'all', 'prep')
  assert(networkingPrep.length > 0)
  assert(networkingPrep.every(question => question.examPrep && question.topicId === 'net-http-quic'))
})


test('the 2025 trial retains its own wording for every quiz and keeps written adaptations separate', () => {
  const source = 'IN3050/old_exams/trial-exam-2025.pdf'
  const paper = getPracticePool(ALL_QUESTIONS, 'IN3050', [], 'all', 'trial-2025')
  assert.equal(paper.length, 40)
  const written = paper.filter(question => question.writtenAdaptation)
  assert.equal(written.length, 5)
  assert(written.every(question => question.type === 'choice'))
  assert.equal(paper.filter(question => question.originalExam === 'trial-2025').length, 35)
  const locations = paper.map(question => question.sourceRefs!.find(reference => reference.path === source)?.location ?? '')
  for (let i = 1; i <= 35; i++) {
    assert.equal(locations.filter(location => location.startsWith(`Part 1, question ${i} ·`)).length, 1)
  }
  for (let i = 1; i <= 5; i++) {
    assert.equal(locations.filter(location => location.startsWith(`Part 2, written prompt ${i} ·`)).length, 1)
  }
  const prep = getPracticePool(ALL_QUESTIONS, 'IN3050', [], 'all', 'prep')
  assert(prep.some(question => question.examPrep && question.sourceRefs?.some(reference => reference.path === source)))
  assert(prep.every(question => question.topicId !== 'ai-reinforcement-learning'))
})

test('all IN3230 topics have complete summaries with registered course sources', () => {
  const course = COURSES.find(course => course.id === 'IN3230')!
  assert.equal(course.topics.length, 12)
  for (const topic of course.topics) {
    const summary = topic.summary
    assert(summary, topic.id)
    assert.equal(summary.topicId, topic.id)
    assert(summary.overview.trim().length > 40, topic.id)
    assert(summary.concepts.length >= 4, topic.id)
    assert(summary.example.steps.length >= 3, topic.id)
    assert(summary.checks.length >= 3, topic.id)
    assert(summary.lowerPriority.trim(), topic.id)
    assert(summary.sourceRefs.some(reference => reference.path.endsWith('/Summary lecture.docx')), topic.id)
    assert(summary.sourceRefs.some(reference => reference.path.endsWith('.pdf')), topic.id)
    for (const reference of summary.sourceRefs) {
      const source = SOURCE_INDEX.get(reference.path)
      assert(source, reference.path)
      assert.equal(source.courseId, 'IN3230', topic.id)
      assert(topic.sourcePaths?.includes(reference.path), reference.path)
      assert(reference.location.trim(), reference.path)
    }
  }
})


test('all current IN3050 syllabus topics have sourced summaries using the wrap-up priorities', () => {
  const course = COURSES.find(course => course.id === 'IN3050')!
  const currentTopics = course.topics.filter(topic =>
    getPracticePool(QUESTIONS, 'IN3050', [topic.id]).length > 0,
  )
  assert.equal(currentTopics.length, 12)
  for (const topic of currentTopics) {
    const summary = topic.summary
    assert(summary, topic.id)
    assert.equal(summary.topicId, topic.id)
    assert(summary.concepts.length >= 4, topic.id)
    assert(summary.example.steps.length >= 3, topic.id)
    assert(summary.checks.length >= 3, topic.id)
    assert(summary.sourceRefs.some(reference => reference.path.endsWith('/Exam preperation - wrap up.docx')), topic.id)
    for (const reference of summary.sourceRefs) {
      const source = SOURCE_INDEX.get(reference.path)
      assert(source, reference.path)
      assert.equal(source.courseId, 'IN3050', topic.id)
      assert(topic.sourcePaths?.includes(reference.path), reference.path)
      assert(reference.location.trim(), reference.path)
    }
  }
})
