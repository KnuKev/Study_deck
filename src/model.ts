export type CourseId = 'IN3050' | 'IN3230'
export type DeckId = `deck-${string}`
export type StudySetId = CourseId | DeckId
export type ExamYear = 2024 | 2025

export interface DeckQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Deck {
  id: DeckId
  title: string
  questions: DeckQuestion[]
}

export type SessionMode = 'practice' | 'exam'
export type EndReason = 'completed' | 'manual' | 'timeout'

export type Difficulty = 'easy' | 'medium' | 'hard'
export interface TopicSummary {
  topicId: string
  overview: string
  concepts: { title: string; explanation: string }[]
  example: { situation: string; steps: string[] }
  checks: { question: string; answer: string }[]
  lowerPriority: string
  sourceRefs: SourceReference[]
}
export interface Topic { id: string; title: string; description: string; order?: number; sourcePaths?: string[]; objectives?: string[]; summary?: TopicSummary }
export interface Course { id: CourseId; title: string; shortTitle: string; description: string; topics: Topic[] }
export interface SourceReference { path: string; location: string }
export interface SourceDocument { path: string; title: string; courseId: CourseId; kind: string; sha256: string }
export interface QuestionTable { caption: string; columns: string[]; rows: string[][] }
export interface QuestionIllustration {
  src: string
  alt: string
  caption: string
  placement: 'question' | 'explanation'
  sourceRef: SourceReference
  credit?: string
}
export interface Question {
  id: string
  courseId: StudySetId
  topicId: string
  type: 'choice' | 'boolean' | 'multi'
  prompt: string
  options: { id: string; text: string }[]
  // Multiple selections use sorted option IDs joined by commas.
  correctOptionId: string
  explanation: string
  source: string
  difficulty: Difficulty
  sourceRefs?: SourceReference[]
  table?: QuestionTable
  isDemo?: boolean
  retired?: boolean
  originalExam?: 'final-2024' | 'final-2025' | 'trial-2025'
  unscored?: boolean
  examYear?: ExamYear
  trial2025?: boolean
  writtenAdaptation?: boolean
  examPrep?: boolean
  practiceSet?: 'quiz' | 'walkthrough'
  instructorOriginal?: boolean
  scopeNote?: string
  promptAfterCode?: string
  illustrations?: QuestionIllustration[]
  guidedReview?: { lesson: string; distractors: string[]; exampleCode: string; takeaway: string }
  historicalOnly?: boolean
  code?: string
  codeOptions?: boolean
  figure?: 'network' | 'pipeline' | 'dense-network' | 'mpls-network' | 'campus-network' | 'exam-dendrogram' | 'trial-learning-curves'
}
export interface Session {
  id: string
  courseId: StudySetId
  mode: SessionMode
  questionIds: string[]
  answers: Record<string, string>
  currentIndex: number
  startedAt: number
  deadline: number | null
  finishedAt: number | null
  endReason: EndReason | null
  deck?: Deck
}
export interface Progress { active: Session | null; history: Session[] }
export interface SessionSummary {
  correct: number
  answered: number
  total: number
  unscored: number
  percentage: number
  elapsedSeconds: number
  topics: { topicId: string; correct: number; answered: number; total: number }[]
}
