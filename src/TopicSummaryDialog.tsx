import { useEffect, useId, useRef } from 'react'
import { SOURCE_INDEX } from './data'
import type { Topic } from './model'
import Icon from './Icon'
import MathText from './MathText'

interface Props {
  topic: Topic | null
  sessionActive: boolean
  onClose: () => void
  onPractise: (topicId: string) => void
}

export default function TopicSummaryDialog({ topic, sessionActive, onClose, onPractise }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const overviewId = useId()
  const summary = topic?.summary

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (summary) {
      if (!dialog.open) dialog.showModal()
      bodyRef.current?.scrollTo(0, 0)
    } else if (dialog.open) {
      dialog.close()
    }
  }, [summary])

  return <dialog
    ref={dialogRef}
    className="topic-summary-dialog"
    aria-labelledby={titleId}
    aria-describedby={overviewId}
    onCancel={onClose}
    onClose={onClose}
  >
    {topic && summary && <>
      <header className="topic-summary-heading">
        <h2 id={titleId}>{topic.title}</h2>
        <button type="button" className="icon-button" autoFocus aria-label="Close summary" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div ref={bodyRef} className="topic-summary-body" key={topic.id}>
        <p id={overviewId} className="topic-summary-overview"><MathText>{summary.overview}</MathText></p>
        <section className="topic-summary-concepts" aria-label="Core concepts">
          {summary.concepts.map(concept => <section key={concept.title}>
            <h3>{concept.title}</h3>
            <p><MathText>{concept.explanation}</MathText></p>
          </section>)}
        </section>
        <section className="topic-summary-example">
          <h3>Work through an example</h3>
          <p><MathText>{summary.example.situation}</MathText></p>
          <ol>{summary.example.steps.map(step => <li key={step}><MathText>{step}</MathText></li>)}</ol>
        </section>
        <section className="topic-summary-checks">
          <h3>Check your understanding</h3>
          {summary.checks.map(check => <details key={check.question}>
            <summary><MathText>{check.question}</MathText></summary>
            <p><MathText>{check.answer}</MathText></p>
          </details>)}
        </section>
        <section className="topic-summary-priorities">
          <h3>Spend less time on</h3>
          <p><MathText>{summary.lowerPriority}</MathText></p>
        </section>
        <details className="topic-summary-sources">
          <summary>Sources</summary>
          <ul>{summary.sourceRefs.map(reference => <li key={reference.path}>
            <strong>{SOURCE_INDEX.get(reference.path)?.title ?? reference.path.split('/').at(-1)}</strong>
            <span>{reference.location}</span>
          </li>)}</ul>
        </details>
      </div>
      <footer className="topic-summary-footer">
        <button type="button" className="primary-button" disabled={sessionActive} onClick={() => onPractise(topic.id)}>
          Practise this topic<Icon name="arrow" />
        </button>
      </footer>
    </>}
  </dialog>
}
