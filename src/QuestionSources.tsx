import type { Question } from './model'
import { SOURCE_INDEX } from './data'

export default function QuestionSources({ question }: { question: Question }) {
  const examItem = (question.examYear || question.trial2025) && !question.examPrep && !question.writtenAdaptation
  if (!question.sourceRefs?.length) return <small>{question.source}</small>
  return <details className="question-sources"><summary>Source references <span>{question.sourceRefs.length}</span></summary>
    {examItem && <p className="small-copy">From the supplied exam paper. Wording or options have been clarified where the source contained errors.</p>}
    <ul>{question.sourceRefs.map((reference, index) => {
    const document = SOURCE_INDEX.get(reference.path)
    return <li key={`${reference.path}-${index}`}><strong>{document?.title ?? reference.path.split('/').at(-1)}</strong><span>{reference.location}</span><small>{reference.path}</small></li>
  })}</ul></details>
}
