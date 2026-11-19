import test from 'node:test'
import assert from 'node:assert/strict'
import { COURSES } from '../src/data.ts'
import { getPracticePool } from '../src/engine.ts'
import { QUESTIONS } from '../src/data.ts'
import { filterTerms, KEY_TERMS } from '../src/glossary.ts'
import type { TermFilters } from '../src/glossary.ts'

const defaults: TermFilters = { courseId: 'all', topicId: 'all', query: '', order: 'alphabetical' }

test('the glossary covers all current syllabus topics with unique, concise definitions', () => {
  assert.equal(new Set(KEY_TERMS.map(entry => entry.id)).size, KEY_TERMS.length)
  for (const course of COURSES) {
    for (const topic of course.topics) {
      if (!getPracticePool(QUESTIONS, course.id, [topic.id]).length) continue
      const entries = KEY_TERMS.filter(entry => entry.topicId === topic.id)
      assert(entries.length >= 5, topic.id)
      assert(topic.summary, topic.id)
      for (const entry of entries) {
        assert.equal(entry.courseId, course.id)
        assert(entry.definition.trim().length > 20, entry.id)
        assert(entry.definition.split(/\s+/).length <= 50, entry.id)
        assert.equal(entry.topicTitle, topic.title)
      }
    }
  }
})

test('search recognizes abbreviations and combines query words with course and topic filters', () => {
  const pca = filterTerms(KEY_TERMS, { ...defaults, query: 'pCa' })
  assert(pca.some(entry => entry.term === 'Principal component analysis'))
  const tcp = filterTerms(KEY_TERMS, { ...defaults, courseId: 'IN3230', topicId: 'net-transport', query: 'reliable TCP' })
  assert(tcp.some(entry => entry.term === 'Transmission Control Protocol'))
  assert(tcp.every(entry => entry.courseId === 'IN3230' && entry.topicId === 'net-transport'))
  assert.equal(filterTerms(KEY_TERMS, { ...defaults, courseId: 'IN3050', query: 'QUIC packet numbers' }).length, 0)
  assert.equal(filterTerms(KEY_TERMS, { ...defaults, query: 'no-such-concept-479' }).length, 0)
})

test('sorting supports alphabetical and syllabus-topic order without changing the source', () => {
  const before = JSON.stringify(KEY_TERMS)
  const alphabetical = filterTerms(KEY_TERMS, defaults)
  for (let i = 1; i < alphabetical.length; i++) {
    assert(alphabetical[i - 1]!.term.localeCompare(alphabetical[i]!.term, 'en', { sensitivity: 'base', numeric: true }) <= 0)
  }
  const grouped = filterTerms(KEY_TERMS, { ...defaults, order: 'topic' })
  for (let i = 1; i < grouped.length; i++) {
    const a = grouped[i - 1]!
    const b = grouped[i]!
    assert(a.courseId < b.courseId || a.courseId === b.courseId && a.topicOrder <= b.topicOrder)
  }
  assert.equal(JSON.stringify(KEY_TERMS), before)
})
