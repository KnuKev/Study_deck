export type CourseId = 'IN3050' | 'IN3230'
export type DeckId = `deck-${string}`
export type StudySetId = CourseId | DeckId

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
export interface Topic { id: string; title: string; description: string; order?: number; sourcePaths?: string[]; objectives?: string[] }
export interface Course { id: CourseId; title: string; shortTitle: string; description: string; topics: Topic[] }
export interface SourceReference { path: string; location: string }
export interface SourceDocument { path: string; title: string; courseId: CourseId; kind: string; sha256: string }
export interface QuestionTable { caption: string; columns: string[]; rows: string[][] }
export interface Question {
  id: string
  courseId: StudySetId
  topicId: string
  type: 'choice' | 'boolean'
  prompt: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation: string
  source: string
  difficulty: Difficulty
  sourceRefs?: SourceReference[]
  table?: QuestionTable
  isDemo?: boolean
  figure?: 'network' | 'pipeline' | 'dense-network' | 'mpls-network' | 'campus-network'
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
  percentage: number
  elapsedSeconds: number
  topics: { topicId: string; correct: number; answered: number; total: number }[]
}
