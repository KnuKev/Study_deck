import type { Question } from './model'
import MathText from './MathText'
import QuestionIllustrations from './QuestionIllustrations'

export default function QuestionExplanation({ question }: { question: Question }) {
  const review = question.guidedReview
  return <>
    {question.scopeNote && <p className="small-copy">{question.scopeNote}</p>}
    {question.explanation && <p><MathText>{question.explanation}</MathText></p>}
    <QuestionIllustrations images={question.illustrations?.filter(image => image.placement === 'explanation') ?? []} />
    {review && <details className="guided-review">
      <summary>Guided review and worked example</summary>
      <p><MathText>{review.lesson}</MathText></p>
      <ul>{review.distractors.map((text, index) => <li key={index}><MathText>{text}</MathText></li>)}</ul>
      <pre className="question-code" tabIndex={0} aria-label="Worked example code"><code>{review.exampleCode}</code></pre>
      <p><MathText>{review.takeaway}</MathText></p>
    </details>}
  </>
}
