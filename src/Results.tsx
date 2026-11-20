import type { Session, SessionSummary, StudySetId } from './model'
import { periodBounds } from './resultsPeriod'
import type { Period } from './resultsPeriod'
import Icon from './Icon'

export const formatSessionDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const chartDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

interface Row {
  session: Session
  score: SessionSummary
  legacy: boolean
}

interface Props {
  rows: Row[]
  sources: { id: StudySetId; title: string }[]
  sourceId: StudySetId
  onSource: (id: StudySetId) => void
  period: Period
  from: string
  through: string
  onPeriod: (period: Period) => void
  onFrom: (date: string) => void
  onThrough: (date: string) => void
  sessionActive: boolean
  today: Date
  onReview: (session: Session) => void
}

function ScoreChart({ rows }: { rows: Row[] }) {
  const first = rows[0]!.session.finishedAt!
  const last = rows.at(-1)!.session.finishedAt!
  const points = rows.map(({ session, score }, index) => ({
    x: 2 + 96 * (last === first ? (rows.length === 1 ? .5 : index / (rows.length - 1)) : (session.finishedAt! - first) / (last - first)),
    y: 100 - score.percentage,
  }))
  const firstLabel = chartDate.format(first)
  const lastLabel = chartDate.format(last)

  return <section className="panel score-chart">
    <div className="panel-heading"><h2>Score over time</h2><Icon name="chart" /></div>
    <div className="chart-layout" aria-hidden="true">
      <div className="chart-scale">{[100, 75, 50, 25, 0].map(value => <span key={value} style={{ top: `${100 - value}%` }}>{value}%</span>)}</div>
      <div className="chart-plot">
        {[0, 25, 50, 75, 100].map(top => <span key={top} className="chart-gridline" style={{ top: `${top}%` }} />)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((point, index) => {
          const { session, score } = rows[index]!
          return <span key={session.id} className="chart-dot" style={{ left: `${point.x}%`, top: `${point.y}%` }} title={`${formatSessionDate.format(session.finishedAt!)} · ${score.percentage}%`} />
        })}
      </div>
      <div className="chart-dates">
        <time dateTime={new Date(first).toISOString()}>{firstLabel}</time>
        {lastLabel !== firstLabel && <time dateTime={new Date(last).toISOString()}>{lastLabel}</time>}
      </div>
    </div>
  </section>
}

export default function Results({ rows, sources, sourceId, onSource, period, from, through, onPeriod, onFrom, onThrough, sessionActive, today, onReview }: Props) {
  const { start, end } = periodBounds(period, from, through, today)
  const invalidRange = period === 'custom' && Boolean(from && through && from > through)
  const visible = invalidRange ? [] : rows.filter(({ session }) => session.finishedAt! >= start && session.finishedAt! < end)
    .sort((a, b) => b.session.finishedAt! - a.session.finishedAt!)
  const scored = visible.filter(row => row.score.total > 0)
  const average = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.score.percentage, 0) / scored.length) : null
  const answered = visible.reduce((sum, row) => sum + Object.keys(row.session.answers).length, 0)

  return <>
    <div className="page-heading"><h1>Results</h1></div>
    <section className="panel results-filters" aria-label="Filter results">
      <label className="form-field">Course or deck
        <select value={sourceId} onChange={event => onSource(event.target.value as StudySetId)}>
          {sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}
        </select>
      </label>
      <label className="form-field">Period
        <select value={period} onChange={event => onPeriod(event.target.value as Period)}>
          <option value="all">All time</option>
          <option value="2">Last 2 days</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>
      {period === 'custom' && <>
        <label className="form-field">From<input type="date" value={from} onChange={event => onFrom(event.target.value)} /></label>
        <label className="form-field">Through<input type="date" value={through} onChange={event => onThrough(event.target.value)} /></label>
      </>}
    </section>
    {visible.length ? <>
      <div className="history-metrics">
        <div className="metric-card"><Icon name="checkCircle" /><strong>{visible.length}</strong><span>completed sessions</span></div>
        <div className="metric-card"><Icon name="target" /><strong>{average === null ? '—' : `${average}%`}</strong><span>average score</span></div>
        <div className="metric-card"><Icon name="book" /><strong>{answered}</strong><span>questions answered</span></div>
      </div>
      {scored.length > 0 && <ScoreChart rows={[...scored].reverse()} />}
      <section className="panel history-panel">
        <div className="panel-heading"><h2>Past sessions</h2></div>
        {visible.map(({ session, score, legacy }) => <button className="history-row" key={session.id} disabled={sessionActive} onClick={() => onReview(session)}>
          <span className="history-icon"><Icon name={session.mode === 'practice' ? 'book' : 'flag'} /></span>
          <span><strong>{session.mode === 'practice' ? 'Practice' : 'Mock exam'} · {session.questionIds.length} {session.questionIds.length === 1 ? 'question' : 'questions'}</strong>
            <small>{formatSessionDate.format(session.finishedAt!)}{legacy ? ' · Legacy sample content' : ''}</small></span>
          <span className="history-score"><strong>{score.total ? `${score.percentage}%` : '—'}</strong><small>{score.total ? `${score.correct} of ${score.total} correct` : 'Not scored'}</small></span>
          <Icon name="chevron" />
        </button>)}
      </section>
    </> : <section className="panel empty-state" aria-live="polite">
      <span className="empty-icon large"><Icon name="chart" /></span>
      <h2>{invalidRange ? 'Check the date range' : rows.length ? 'No sessions in this period' : 'No sessions yet'}</h2>
      {invalidRange && <p>The start date must be on or before the end date.</p>}
    </section>}
  </>
}
