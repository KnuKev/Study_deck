import { IN3050_EXAM_GUIDANCE as guidance } from './examGuidance'

export default function ExamPreparationGuidance() {
  return <details className="panel exam-guidance">
    <summary>Exam scope and format</summary>
    <ul>
      <li>About {guidance.format.approximateQuestions} multiple-choice questions, primarily based on lecture slides.</li>
      <li>{guidance.excludedMaterial} is excluded.</li>
      <li>Use Fall 2024 and Fall 2025 for the question format. {guidance.notFormatReference} used a different format.</li>
    </ul>
    <p className="small-copy">Walkthrough slides: awaiting the remaining material.</p>
  </details>
}
