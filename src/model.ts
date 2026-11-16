export type CourseId = 'IN3050' | 'IN3230'
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
  courseId: CourseId
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
  courseId: CourseId
  mode: SessionMode
  questionIds: string[]
  answers: Record<string, string>
  currentIndex: number
  startedAt: number
  deadline: number | null
  finishedAt: number | null
  endReason: EndReason | null
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
