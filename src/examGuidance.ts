import guidance from './content/in3050-exam-guidance.json' with { type: 'json' }
import sources from './content/sources.json' with { type: 'json' }
import type { Question } from './model.ts'

export const IN3050_EXAM_GUIDANCE = guidance
const recommendedPaths = new Set(guidance.recommendedPapers.map(paper => paper.path))
const slidePaths = new Set(sources.filter(source => source.courseId === 'IN3050' && source.kind === 'Lecture slides').map(source => source.path))

export function hasRecommendedPaper(question: Question): boolean {
  return question.courseId === 'IN3050' && Boolean(question.sourceRefs?.some(reference => recommendedPaths.has(reference.path)))
}

export function hasLectureMaterial(question: Question): boolean {
  return question.courseId === 'IN3050' && Boolean(question.sourceRefs?.some(({ path }) => slidePaths.has(path)
    || path.includes('/personal_notes/Forelesning/')
    || /\/Lecture_\d+_[^/]+\/01_theory_[^/]+\.ipynb$/.test(path)))
}

export function isIN3050ExamPreparation(question: Question): boolean {
  return hasRecommendedPaper(question) || hasLectureMaterial(question)
}

export function getPracticePriority(question: Question): number {
  if (question.courseId !== 'IN3050') return question.examPrep ? 4 : 1
  if (question.sourceRefs?.some(reference => slidePaths.has(reference.path))) return 5
  if (hasRecommendedPaper(question)) return 4
  if (hasLectureMaterial(question)) return 3
  return 1
}
