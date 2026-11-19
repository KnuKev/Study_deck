import { useId } from 'react'
import { COURSES } from './data'
import { filterTerms, KEY_TERMS } from './glossary'
import type { KeyTerm, TermFilters } from './glossary'
import Icon from './Icon'

interface Props {
  filters: TermFilters
  onChange: (filters: TermFilters) => void
}

function TermList({ terms, showTopic }: { terms: KeyTerm[]; showTopic: boolean }) {
  return <dl className="glossary-list">
    {terms.map(entry => <div className="glossary-entry" key={entry.id}>
      <dt>
        <span>{entry.term}</span>
        {entry.aliases.length > 0 && <span className="glossary-aliases">{entry.aliases.join(' · ')}</span>}
      </dt>
      <dd>
        <p>{entry.definition}</p>
        {showTopic && <span className="glossary-topic">{entry.courseId} · {entry.topicTitle}</span>}
      </dd>
    </div>)}
  </dl>
}

export default function KeyTerms({ filters, onChange }: Props) {
  const resultId = useId()
  const courseId = useId()
  const topicId = useId()
  const orderId = useId()
  const topics = COURSES.filter(course => filters.courseId === 'all' || course.id === filters.courseId)
    .flatMap(course => course.topics.filter(topic => KEY_TERMS.some(entry => entry.topicId === topic.id))
      .map(topic => ({ ...topic, courseId: course.id })))
  const visible = filterTerms(KEY_TERMS, filters)
  const grouped = filters.order === 'topic'
  const activeFilter = filters.courseId !== 'all' || filters.topicId !== 'all' || Boolean(filters.query)
  const sections = grouped ? topics.map(topic => ({
    topic,
    terms: visible.filter(entry => entry.topicId === topic.id),
  })).filter(section => section.terms.length) : []

  return <>
    <div className="page-heading"><h1>Key terms</h1></div>
    <section className="panel glossary-filters" aria-label="Filter key terms">
      <label className="form-field glossary-search">Search
        <input type="search" value={filters.query} placeholder="Term, abbreviation, or definition"
          aria-controls={resultId} onChange={event => onChange({ ...filters, query: event.target.value })} />
      </label>
      <div className="form-field">
        <label htmlFor={courseId}>Course</label>
        <span className="select-control">
          <select id={courseId} value={filters.courseId} aria-controls={resultId} onChange={event => onChange({
            ...filters,
            courseId: event.target.value as TermFilters['courseId'],
            topicId: 'all',
          })}>
            <option value="all">Both courses</option>
            {COURSES.map(course => <option key={course.id} value={course.id}>{course.id}</option>)}
          </select>
          <Icon name="chevron" />
        </span>
      </div>
      <div className="form-field">
        <label htmlFor={topicId}>Topic</label>
        <span className="select-control">
          <select id={topicId} value={filters.topicId} aria-controls={resultId} onChange={event => onChange({ ...filters, topicId: event.target.value })}>
            <option value="all">All topics</option>
            {topics.map(topic => <option key={topic.id} value={topic.id}>
              {filters.courseId === 'all' ? topic.courseId + ' · ' : ''}{topic.title}
            </option>)}
          </select>
          <Icon name="chevron" />
        </span>
      </div>
      <div className="form-field">
        <label htmlFor={orderId}>Sort</label>
        <span className="select-control">
          <select id={orderId} value={filters.order} aria-controls={resultId} onChange={event => onChange({
            ...filters, order: event.target.value as TermFilters['order'],
          })}>
            <option value="alphabetical">A–Z</option>
            <option value="topic">By topic</option>
          </select>
          <Icon name="chevron" />
        </span>
      </div>
    </section>
    <div className="glossary-count">
      <span role="status" aria-live="polite" aria-atomic="true">{visible.length} {visible.length === 1 ? 'term' : 'terms'}</span>
      {activeFilter && <button className="text-button" onClick={() => onChange({
        ...filters, courseId: 'all', topicId: 'all', query: '',
      })}>Clear filters</button>}
    </div>
    <div id={resultId}>
      {!visible.length ? <section className="panel glossary-empty"><h2>No matching terms</h2></section> :
        grouped ? <div className="glossary-groups">
          {sections.map(({ topic, terms }) => <section className="panel glossary-group" key={topic.id}>
            <div className="glossary-group-heading"><h2>{topic.title}</h2><span>{topic.courseId}</span></div>
            <TermList terms={terms} showTopic={false} />
          </section>)}
        </div> : <section className="panel glossary-alphabetical" aria-label="Terms in alphabetical order">
          <TermList terms={visible} showTopic={filters.topicId === 'all'} />
        </section>}
    </div>
  </>
}
