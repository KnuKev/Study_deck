import type { Question } from './model'
import { SOURCE_INDEX } from './data'

export default function QuestionSources({ question }: { question: Question }) {
  if (!question.sourceRefs?.length) return <small>{question.source}</small>
  const examBased = question.sourceRefs.some(reference => SOURCE_INDEX.get(reference.path)?.kind === 'Exam')
  return <details className="question-sources"><summary>Source references <span>{question.sourceRefs.length}</span></summary>{examBased && <p className="small-copy">Adapted from a past or mock exam. Wording, numbers, and answer options may differ.</p>}<ul>{question.sourceRefs.map((reference, index) => {
    const document = SOURCE_INDEX.get(reference.path)
    return <li key={`${reference.path}-${index}`}><strong>{document?.title ?? reference.path.split('/').at(-1)}</strong><span>{reference.location}</span><small>{reference.path}</small></li>
  })}</ul></details>
}
