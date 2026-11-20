import type { Question } from './model.ts'

export const GROUP_SETS = [
  { id: 'quiz', label: 'Practice quiz', count: 18 },
  { id: 'walkthrough', label: 'Exam walkthrough', count: 6 },
] as const
export type GroupSelection = 'all' | typeof GROUP_SETS[number]['id']
export function getGroupSessionPool(questions: readonly Question[], selection: GroupSelection, currentTopicsOnly = false): Question[] {
  return questions.filter(question => question.courseId === 'IN3050' && !question.retired && !question.isDemo && question.instructorOriginal
    && GROUP_SETS.some(set => question.practiceSet === set.id && (selection === 'all' || selection === set.id))
    && (!currentTopicsOnly || !question.historicalOnly))
}
export function groupSelectionLabel(selection: GroupSelection): string {
  return GROUP_SETS.find(set => set.id === selection)?.label ?? 'Group session'
}
