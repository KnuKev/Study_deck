import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { QUESTIONS, SOURCE_INDEX } from '../src/data.ts'
import { answerQuestion, createSession, getOrderedOptions, getPracticePool, summarizeSession } from '../src/engine.ts'
import { getGroupSessionPool } from '../src/groupSession.ts'
import fixtures from './fixtures/group-session.json' with { type: 'json' }
import images from './fixtures/slide-illustrations.json' with { type: 'json' }
import { renderMath, splitMath } from '../src/math.ts'
import { getPracticePriority, IN3050_EXAM_GUIDANCE } from '../src/examGuidance.ts'

test('group sets contain every supplied item once, with exact source options and keys', () => {
  const pool = getGroupSessionPool(QUESTIONS, 'all')
  assert.equal(pool.length, 24)
  assert.equal(getGroupSessionPool(QUESTIONS, 'quiz').length, 18)
  assert.equal(getGroupSessionPool(QUESTIONS, 'walkthrough').length, 6)
  assert.equal(getGroupSessionPool(QUESTIONS, 'all', true).length, 23)
  assert(!getPracticePool(QUESTIONS, 'IN3050', []).some(q => q.id === 'in3050-group-walkthrough-04'))
  for (const fixture of fixtures) {
    const question = pool.find(q => q.id === fixture.id)!
    assert(question)
    assert.deepEqual(question.options, Object.entries(fixture.options).map(([id,text]) => ({id:id.toLowerCase(),text})))
    assert.equal(question.correctOptionId,fixture.answers.map(id=>id.toLowerCase()).sort().join(','))
    assert.deepEqual(getOrderedOptions(question,'a'),question.options)
    assert.deepEqual(getOrderedOptions(question,'b'),question.options)
  }
  assert(!pool.some(q=>q.originalExam))
  const mutation=pool.find(q=>q.id==='in3050-group-quiz-18')!
  assert(mutation.code?.includes('if random_number() < mutation_rate:'))
  assert(mutation.promptAfterCode?.includes('0 < mutation_rate < 1'))
})

test('the three-answer item uses exact-match scoring', () => {
  const q = QUESTIONS.find(q=>q.id==='in3050-group-quiz-02')!
  assert.equal(q.correctOptionId,'a,e,f')
  const session=createSession({courseId:'IN3050',mode:'practice',questionIds:[q.id],durationMinutes:null},1000)
  assert.throws(()=>answerQuestion(session,q.id,'a,e',QUESTIONS,2000))
  const answered=answerQuestion(session,q.id,'f,a,e',QUESTIONS,2000)
  assert.equal(summarizeSession(answered,QUESTIONS,3000).correct,1)
})

test('the final plenary supports the quiz priority and NumPy guidance', () => {
  const note=IN3050_EXAM_GUIDANCE.plenaryGuidance.sourcePath
  assert(SOURCE_INDEX.has(note))
  const quiz=getGroupSessionPool(QUESTIONS,'quiz')
  assert(quiz.every(q=>q.sourceRefs?.some(ref=>ref.path===note)))
  const walkthrough=getGroupSessionPool(QUESTIONS,'walkthrough')[0]!
  const final=QUESTIONS.find(q=>q.originalExam==='final-2025')!
  assert(getPracticePriority(quiz[0]!)>getPracticePriority(walkthrough))
  assert(getPracticePriority(quiz[0]!)>getPracticePriority(final))
})

test('all guided reviews include reasoning, a code example, and valid math', () => {
  for(const q of getGroupSessionPool(QUESTIONS,'quiz')) {
    const review=q.guidedReview!
    assert(review && review.lesson && review.exampleCode && review.takeaway,q.id)
    assert(review.distractors.length>0,q.id)
    assert(q.sourceRefs?.some(ref=>ref.path.endsWith('IN3050_Guided_Review.ipynb')))
    for(const text of [review.lesson,review.takeaway,...review.distractors]) {
      for(const part of splitMath(text))if(part.kind==='math')assert.doesNotThrow(()=>renderMath(part.value,part.display),q.id)
    }
  }
})

test('slide figures are local, registered and pinned to the exported source crops', () => {
  const illustrated=QUESTIONS.filter(q=>q.illustrations?.length)
  assert(illustrated.filter(q=>q.courseId==='IN3230').length>=13)
  assert(illustrated.filter(q=>q.courseId==='IN3050').length>=4)
  assert.equal(getPracticePool(QUESTIONS,'IN3050',[],'all','illustrations').length,2)
  assert.equal(getPracticePool(QUESTIONS,'IN3230',[],'all','illustrations').length,13)
  for(const q of illustrated)for(const image of q.illustrations!) {
    assert.match(image.src,/^illustrations\/[a-z0-9-]+\.webp$/)
    const bytes=readFileSync(new URL('../public/'+image.src,import.meta.url))
    assert.equal(bytes.toString('ascii',0,4),'RIFF')
    assert.equal(bytes.toString('ascii',8,12),'WEBP')
    assert(image.alt.length>20 && image.caption)
    assert(SOURCE_INDEX.has(image.sourceRef.path),image.sourceRef.path)
    assert(q.sourceRefs?.some(ref=>ref.path===image.sourceRef.path))
  }
  for(const fixture of images) {
    const bytes=readFileSync(new URL('../public/'+fixture.src,import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256)
  }
})
