import type { Question } from './model.ts'

export const PAST_EXAMS = [
  { id: 'final-2025', label: 'Fall 2025', path: 'IN3050/old_exams/in4050in3050_-december-8th-2025.pdf', recommended: true },
  { id: 'final-2024', label: 'Fall 2024', path: 'IN3050/old_exams/in40503050-final-exam_2024.pdf', recommended: true },
  { id: 'trial-2025', label: '2025 trial exam (extra practice)', path: 'IN3050/old_exams/trial-exam-2025.pdf', recommended: false },
] as const

export type PastExamId = typeof PAST_EXAMS[number]['id']
export type ExamSelection = PastExamId | 'all' | 'fall'

export function examSelectionLabel(selection: ExamSelection): string {
  if (selection === 'fall') return 'Fall 2024 and Fall 2025'
  return PAST_EXAMS.find(exam => exam.id === selection)?.label ?? 'All past exams'
}

export function getPastExamPool(questions: readonly Question[], selection: ExamSelection, currentTopicsOnly = false): Question[] {
  return questions.filter(question => {
    if (question.courseId !== 'IN3050' || question.isDemo || question.retired || question.examPrep || question.writtenAdaptation) return false
    if (currentTopicsOnly && question.historicalOnly) return false
    return PAST_EXAMS.some(paper => question.originalExam === paper.id && (selection === 'all' || paper.id === selection || selection === 'fall' && paper.recommended)
      && question.sourceRefs?.some(reference => reference.path === paper.path))
  })
}
