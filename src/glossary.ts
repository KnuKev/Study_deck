import groups from './content/key-terms.json' with { type: 'json' }
import { COURSES } from './data.ts'
import type { CourseId } from './model.ts'

export interface KeyTerm {
  id: string
  term: string
  aliases: string[]
  definition: string
  courseId: CourseId
  topicId: string
  topicTitle: string
  topicOrder: number
}

export interface TermFilters {
  courseId: CourseId | 'all'
  topicId: string
  query: string
  order: 'alphabetical' | 'topic'
}

export const KEY_TERMS: KeyTerm[] = groups.flatMap(group => {
  const course = COURSES.find(item => item.topics.some(topic => topic.id === group.topicId))
  const topic = course?.topics.find(item => item.id === group.topicId)
  if (!course || !topic) throw new Error('Unknown glossary topic: ' + group.topicId)
  return group.terms.map(entry => ({
    ...entry,
    id: group.topicId + ':' + entry.term,
    courseId: course.id,
    topicId: topic.id,
    topicTitle: topic.title,
    topicOrder: course.topics.indexOf(topic),
  }))
})

function searchable(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-GB')
}

export function filterTerms(terms: readonly KeyTerm[], filters: TermFilters): KeyTerm[] {
  const words = searchable(filters.query).trim().split(/\s+/).filter(Boolean)
  const selected = terms.filter(entry => {
    if (filters.courseId !== 'all' && entry.courseId !== filters.courseId) return false
    if (filters.topicId !== 'all' && entry.topicId !== filters.topicId) return false
    const text = searchable([entry.term, ...entry.aliases, entry.definition, entry.topicTitle, entry.courseId].join(' '))
    return words.every(word => text.includes(word))
  })
  return selected.sort((a, b) => {
    if (filters.order === 'topic') {
      const topicOrder = a.courseId.localeCompare(b.courseId) || a.topicOrder - b.topicOrder
      if (topicOrder) return topicOrder
    }
    return a.term.localeCompare(b.term, 'en', { sensitivity: 'base', numeric: true })
      || a.courseId.localeCompare(b.courseId)
  })
}
