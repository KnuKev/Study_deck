import type { Question } from './model.ts'

export const PAST_EXAMS = [
  { id: 'final-2025', label: '2025 final exam', path: 'IN3050/old_exams/in4050in3050_-december-8th-2025.pdf' },
  { id: 'trial-2025', label: '2025 trial exam', path: 'IN3050/old_exams/trial-exam-2025.pdf' },
  { id: 'final-2024', label: '2024 final exam', path: 'IN3050/old_exams/in40503050-final-exam_2024.pdf' },
] as const

export type PastExamId = typeof PAST_EXAMS[number]['id']
export type ExamSelection = PastExamId | 'all'

export function getPastExamPool(questions: readonly Question[], selection: ExamSelection): Question[] {
  return questions.filter(question => {
    if (question.courseId !== 'IN3050' || question.isDemo || question.retired || question.examPrep || question.writtenAdaptation) return false
    return PAST_EXAMS.some(paper => question.originalExam === paper.id && (selection === 'all' || paper.id === selection)
      && question.sourceRefs?.some(reference => reference.path === paper.path))
  })
}
