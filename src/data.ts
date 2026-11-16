import type { Course, Question, SourceDocument, Topic } from './model.ts'
import in3050Questions from './content/in3050.json' with { type: 'json' }
import in3050ExamFoundations from './content/in3050-exam-foundations.json' with { type: 'json' }
import in3050ExamLearning from './content/in3050-exam-learning.json' with { type: 'json' }
import in3230CoreQuestions from './content/in3230-core.json' with { type: 'json' }
import in3230AdvancedQuestions from './content/in3230-advanced.json' with { type: 'json' }
import in3230Notes from './content/in3230-notes.json' with { type: 'json' }
import in3050Unsupervised from './content/in3050-unsupervised.json' with { type: 'json' }
import in3230WirelessIoT from './content/in3230-wireless-iot.json' with { type: 'json' }
import in3050Topics from './content/in3050-topics.json' with { type: 'json' }
import in3230CoreTopics from './content/in3230-core-topics.json' with { type: 'json' }
import in3230AdvancedTopics from './content/in3230-advanced-topics.json' with { type: 'json' }
import sources from './content/sources.json' with { type: 'json' }
import archived from './content/archived.json' with { type: 'json' }
import { LEGACY_COURSES, LEGACY_QUESTIONS } from './legacyDemo.ts'

export const CONTENT_UPDATED = '2026-11-15'
export const DIFFICULTY_LABELS = { easy: 'Basic', medium: 'Intermediate', hard: 'Challenging' } as const
export const QUESTIONS = [...in3050Questions, ...in3050ExamFoundations, ...in3050ExamLearning, ...in3050Unsupervised, ...in3230CoreQuestions, ...in3230AdvancedQuestions, ...in3230Notes, ...in3230WirelessIoT] as Question[]
export const ALL_QUESTIONS = [...QUESTIONS, ...(archived as Question[]), ...LEGACY_QUESTIONS]
export const QUESTION_INDEX = new Map(ALL_QUESTIONS.map(question => [question.id, question]))
export const LEGACY_TOPICS = LEGACY_COURSES.flatMap(course => course.topics)
function withQuestionSources(topics: Topic[]): Topic[] {
  return topics.map(topic => ({
    ...topic,
    sourcePaths: [...new Set([
      ...(topic.sourcePaths ?? []),
      ...QUESTIONS.filter(question => question.topicId === topic.id).flatMap(question => question.sourceRefs?.map(reference => reference.path) ?? []),
    ])],
  }))
}
export const COURSES: Course[] = [
  { id: 'IN3050', shortTitle: 'Artificial intelligence', title: 'Introduction to Artificial Intelligence and Machine Learning', description: 'Linear algebra, search, evolutionary algorithms, and machine learning.', topics: withQuestionSources(in3050Topics as Topic[]) },
  { id: 'IN3230', shortTitle: 'Networking', title: 'Networking', description: 'Network architecture, transport, wireless communications, and modern networks.', topics: withQuestionSources([...in3230CoreTopics, ...in3230AdvancedTopics].sort((a, b) => a.order - b.order) as Topic[]) },
]
const usedPaths = new Set([...QUESTIONS.flatMap(question => question.sourceRefs?.map(reference => reference.path) ?? []), ...COURSES.flatMap(course => course.topics.flatMap(topic => topic.sourcePaths ?? []))])
export const SOURCES = (sources as SourceDocument[]).filter(source => usedPaths.has(source.path))
export const SOURCE_INDEX = new Map(SOURCES.map(source => [source.path, source]))
