import { useEffect, useRef, useState } from 'react'
import { ALL_QUESTIONS, COURSES, QUESTIONS, QUESTION_INDEX, SOURCE_INDEX, SOURCES, LEGACY_TOPICS, DIFFICULTY_LABELS } from './data'
import { answerQuestion, createSession, finishSession, getRemainingSeconds, getOrderedOptions, getPracticePool, summarizeSession } from './engine'
import type { Difficulty, Session } from './model'
import { loadProgress, saveProgress } from './storage'
import Icon from './Icon'
import QuestionFigure from './QuestionFigure'
import QuestionSources from './QuestionSources'
import QuestionTable from './QuestionTable'
import MathText from './MathText'
import { useSlidingIndicator } from './useSlidingIndicator'

type View = 'practice' | 'history' | 'syllabus'
type CourseId = 'IN3050' | 'IN3230'
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const number = (value: number) => value.toLocaleString('en-GB')
const countLabel = (count: number, noun: string) => `${number(count)} ${noun}${count === 1 ? '' : 's'}`
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.max(0, seconds % 60).toString().padStart(2, '0')}`
const topicTitle = (id: string) => [...COURSES.flatMap(course => course.topics), ...LEGACY_TOPICS].find(topic => topic.id === id)?.title ?? id
const questionById = (id: string) => QUESTION_INDEX.get(id)!

function readTheme(): 'light' | 'dark' {
  try {
    const value = localStorage.getItem('exam-quizer-theme')
    if (value === 'light' || value === 'dark') return value
  } catch { /* Use the system theme when browser storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [progress, setProgress] = useState(() => loadProgress(ALL_QUESTIONS))
  const { active, history } = progress
  const [view, setView] = useState<View>('practice')
  const [courseId, setCourseId] = useState<CourseId>(() => active?.courseId ?? 'IN3050')
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [mode, setMode] = useState<'practice' | 'exam'>('practice')
  const [duration, setDuration] = useState<number | null>(15)
  const [count, setCount] = useState(10)
  const [theme, setTheme] = useState(readTheme)
  const [now, setNow] = useState(Date.now)
  const [selected, setSelected] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const endDialog = useRef<HTMLDialogElement>(null)
  const selectionHeading = useRef<HTMLHeadingElement>(null)
  const course = COURSES.find(item => item.id === courseId)!
  const selectedTopics = course.topics.filter(topic => topicIds.includes(topic.id))
  const pool = getPracticePool(QUESTIONS, courseId, topicIds, difficulty)
  const courseSources = SOURCES.filter(source => source.courseId === courseId)
  const countOption = count > pool.length ? 0 : count
  const selectedCount = countOption === 0 ? pool.length : countOption
  const result = history.find(item => item.id === resultId)
  const courseHistory = history.filter(item => item.courseId === courseId)
  const showSetup = view === 'practice' && !active && !result
  const mainNav = useSlidingIndicator<HTMLElement>(view, '[aria-current="page"]')
  const durationOptions = useSlidingIndicator<HTMLDivElement>(showSetup ? duration ?? 'untimed' : null)
  const difficultyOptions = useSlidingIndicator<HTMLDivElement>(showSetup ? difficulty : null)
  const countOptions = useSlidingIndicator<HTMLDivElement>(showSetup ? countOption : null)
  const summary = result ? summarizeSession(result, ALL_QUESTIONS) : null
  const remaining = active ? getRemainingSeconds(active, now) : null
  const current = active ? questionById(active.questionIds[active.currentIndex]!) : null
  const recorded = active && current ? active.answers[current.id] : undefined
  const isFeedback = Boolean(active?.mode === 'practice' && recorded)

  useEffect(() => {
    setStorageAvailable(saveProgress(progress))
  }, [progress])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('exam-quizer-theme', theme) } catch { /* Theme still works for this visit. */ }
  }, [theme])

  useEffect(() => {
    if (!active) return
    const tick = () => {
      const currentTime = Date.now()
      setNow(currentTime)
      if (active.deadline !== null && currentTime >= active.deadline) {
        setProgress(previous => {
          if (previous.active?.id !== active.id) return previous
          const finished = finishSession(previous.active, 'timeout', currentTime)
          return { active: null, history: [finished, ...previous.history.filter(item => item.id !== finished.id)].slice(0, 100) }
        })
        setResultId(active.id)
        setView('practice')
        setConfirmEnd(false)
      }
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [active])

  useEffect(() => {
    setSelected(null)
    if (current) questionHeading.current?.focus()
  }, [current?.id])

  useEffect(() => {
    if (confirmEnd) endDialog.current?.showModal()
    else endDialog.current?.close()
  }, [confirmEnd])

  function chooseCourse(id: CourseId) {
    setCourseId(id)
    setTopicIds([])
    setDifficulty('all')
    setResultId(null)
  }

  function toggleTopic(id: string) {
    setTopicIds(previous => previous.includes(id) ? previous.filter(topic => topic !== id) : [...previous, id])
  }

  function start(ids?: string[]) {
    const shuffled = createSession({ courseId, mode: ids ? 'practice' : mode, questionIds: ids ?? pool.map(question => question.id), durationMinutes: ids ? null : duration })
    const session = ids ? shuffled : { ...shuffled, questionIds: shuffled.questionIds.slice(0, selectedCount) }
    setProgress(previous => ({ ...previous, active: session }))
    setResultId(null)
    setSelected(null)
    setNow(Date.now())
    setView('practice')
  }

  function finish(session: Session, reason: 'completed' | 'manual' | 'timeout') {
    const finished = finishSession(session, reason)
    setProgress(previous => ({ active: null, history: [finished, ...previous.history.filter(item => item.id !== finished.id)].slice(0, 100) }))
    setResultId(finished.id)
    setConfirmEnd(false)
    setView('practice')
  }

  function advance(session: Session) {
    if (session.currentIndex === session.questionIds.length - 1) finish(session, 'completed')
    else setProgress(previous => ({ ...previous, active: { ...session, currentIndex: session.currentIndex + 1 } }))
  }

  function submit() {
    if (!active || !current || !selected || recorded || remaining === 0) return
    const updated = answerQuestion(active, current.id, selected, ALL_QUESTIONS)
    if (updated.finishedAt !== null) finish(updated, 'timeout')
    else if (active.mode === 'exam') advance(updated)
    else setProgress(previous => ({ ...previous, active: updated }))
  }

  function navigate(next: View) { setView(next); setResultId(null) }

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="floating-toolbar">
      <div className="app-wordmark"><span className="wordmark-symbol"><Icon name="layers" /></span><strong>Exam <span>Quizer</span></strong></div>
      <nav ref={mainNav} className="main-nav sliding-indicator" aria-label="Main navigation">
        {([{ id: 'practice', label: 'Practice', icon: 'book' }, { id: 'history', label: 'Results', icon: 'chart' }, { id: 'syllabus', label: 'Syllabus', icon: 'layers' }] as const).map(item => <button key={item.id} className={'nav-item' + (view === item.id ? ' is-current' : '')} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon name={item.icon} />{item.label}</button>)}
      </nav>
      <div className="display-controls"><span className="local-status"><span />{storageAvailable ? 'Saved locally' : 'Storage unavailable'}</span><button className="icon-button theme-toggle" title={theme === 'dark' ? 'Light theme' : 'Dark theme'} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button></div>
    </header>

    <aside className="sidebar" aria-label="Courses and topics">
      <div className="sidebar-title"><h2>Your courses</h2><span className="quiet-badge">2 courses</span></div>
      <div className="course-options">
        {COURSES.map(item => <button key={item.id} disabled={Boolean(active)} className={'course-option' + (courseId === item.id ? ' selected' : '')} onClick={() => chooseCourse(item.id)} aria-pressed={courseId === item.id}><span className="course-symbol"><Icon name={item.id === 'IN3050' ? 'brain' : 'network'} /></span><span><strong>{item.id}</strong><small>{item.shortTitle}</small></span><Icon name="chevron" /></button>)}
      </div>
      <div className="sidebar-section-heading"><h3>Topics</h3><span>{course.topics.length}</span></div>
      <button className={'all-topics' + (!topicIds.length ? ' selected' : '')} onClick={() => setTopicIds([])} disabled={Boolean(active)} aria-pressed={!topicIds.length}><Icon name="layers" />All topics<span>{QUESTIONS.filter(question => question.courseId === courseId).length}</span></button>
      <div className="topic-options">{course.topics.map(topic => <label key={topic.id} className={topicIds.includes(topic.id) ? 'selected' : ''}><input type="checkbox" checked={topicIds.includes(topic.id)} disabled={Boolean(active)} onChange={() => toggleTopic(topic.id)} /><span>{topic.title}</span><small>{QUESTIONS.filter(question => question.topicId === topic.id).length}</small></label>)}</div>
      <p className="sidebar-hint">{active ? 'Course and topic selection are locked during a session.' : 'Choose one or more topics, or practise the whole course.'}</p>
      <div className="sidebar-bottom"><span className="sample-pill"><span />Course-based practice</span><p>Questions from lectures, group exercises, and notes, with explanations and references.</p><button className="text-button" onClick={() => navigate('syllabus')}>Browse syllabus<Icon name="arrow" /></button></div>
    </aside>

    <main id="main-content" className="main-content">
      {!storageAvailable && <div className="storage-notice" role="alert"><Icon name="info" /><span>Your browser could not save your progress. You can continue, but closing the page may lose this session.</span></div>}
      {active && view !== 'practice' && <button className="resume-banner" onClick={() => setView('practice')}><Icon name="play" /><span>Session in progress for {active.courseId}</span><strong>{remaining === null ? 'No time limit' : time(remaining)}</strong><span>Resume<Icon name="arrow" /></span></button>}

      {showSetup && <>
        <div className="page-heading"><div><h1>Practice</h1><p>Multiple-choice and true-or-false questions.</p></div><span className="page-tag">{courseId}</span></div>
        <div className="overview-grid">
          <div className="overview-feature"><span><Icon name={courseId === 'IN3050' ? 'brain' : 'network'} />Selected course</span><h2>{courseId}</h2><p>{course.title}</p></div>
          <div className="metric-card"><Icon name="book" /><strong aria-live="polite" aria-atomic="true"><span className="sr-only">Available questions </span>{pool.length}</strong><span>available questions</span><small>{difficulty === 'all' ? 'All difficulty levels' : DIFFICULTY_LABELS[difficulty]}</small></div>
          <div className="metric-card"><Icon name="checkCircle" /><strong>{courseHistory.length ? number(courseHistory.length) : '—'}</strong><span>completed sessions</span><small>{courseHistory.length ? 'Saved on this device' : 'Start your first session'}</small></div>
        </div>
        <div className="setup-grid">
          <section className="panel session-setup"><div className="panel-heading"><h2>Set up a session</h2><Icon name="target" /></div>
            <fieldset><legend>Mode</legend><div className="mode-options"><button className={mode === 'practice' ? 'selected' : ''} aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}><Icon name="book" /><strong>Practice</strong><span>See the answer and explanation after each question.</span>{mode === 'practice' && <Icon name="checkCircle" />}</button><button className={mode === 'exam' ? 'selected' : ''} aria-pressed={mode === 'exam'} onClick={() => setMode('exam')}><Icon name="flag" /><strong>Mock exam</strong><span>Answer the questions and review the answers at the end.</span>{mode === 'exam' && <Icon name="checkCircle" />}</button></div></fieldset>
            <fieldset><legend><Icon name="clock" />Duration</legend><div ref={durationOptions} className="segmented duration-options sliding-indicator">{[15, 30, 45, 60, null].map(minutes => <button key={minutes ?? 'none'} aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes === null ? 'Untimed' : `${minutes} min`}</button>)}</div><p className="field-hint">{duration ? 'The session ends when you finish or time runs out. The timer keeps running if you leave the page.' : 'Work at your own pace. You can resume the session after reloading the page.'}</p></fieldset>
            <fieldset><legend>Difficulty</legend><div ref={difficultyOptions} className="segmented difficulty-options sliding-indicator">{(['all', 'easy', 'medium', 'hard'] as const).map(level => <button key={level} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>{level === 'all' ? 'Mixed' : DIFFICULTY_LABELS[level]}</button>)}</div><p className="field-hint">{difficulty === 'hard' ? 'Multi-step problems, calculations, and applied concepts.' : difficulty === 'easy' ? 'Core concepts and principles from the lectures.' : difficulty === 'medium' ? 'Interpretation, comparisons, and short calculations.' : 'A mix of basic, intermediate, and challenging questions.'}</p></fieldset>
            <fieldset><legend>Number of questions</legend><div ref={countOptions} className="segmented count-options sliding-indicator">{[5, 10, 20, 40, 0].map(amount => <button key={amount} disabled={amount > pool.length} aria-pressed={amount === countOption} onClick={() => setCount(amount)}>{amount === 0 ? 'All' : amount}</button>)}</div></fieldset>
            <div className="session-start"><span><strong>{countLabel(selectedCount, 'question')}</strong><small>{topicIds.length ? `${countLabel(topicIds.length, 'topic')} selected` : 'All topics'} · {duration ? `${duration} minutes` : 'No time limit'}</small></span><button className="primary-button" disabled={!selectedCount} onClick={() => start()}>Start session<Icon name="arrow" /></button></div>
          </section>
          <div className="setup-aside">
            <section className="panel selection-panel">
              <div className="panel-heading"><h2 ref={selectionHeading} tabIndex={-1}>Question pool</h2><span className="quiet-badge">{courseId}</span></div>
              <div className="selection-counts"><span><Icon name="layers" />Multiple choice<strong>{pool.filter(question => question.type === 'choice').length}</strong></span><span><Icon name="checkCircle" />True or false<strong>{pool.filter(question => question.type === 'boolean').length}</strong></span></div>
              <p className="small-copy">Questions are drawn at random from the pool.</p>
              {selectedTopics.length ? <div className="selected-topics">
                <div className="selected-topics-heading"><h3>Selected topics</h3><button type="button" className="text-button" onClick={() => { setTopicIds([]); selectionHeading.current?.focus() }}>Show all topics</button></div>
                <ul className="selected-topic-list">{selectedTopics.map(topic => <li key={topic.id}>
                  <button type="button" aria-label={'Remove topic ' + topic.title} onClick={event => {
                    const item = event.currentTarget.parentElement
                    const sibling = item?.nextElementSibling ?? item?.previousElementSibling
                    const nextFocus = sibling?.querySelector('button') ?? selectionHeading.current
                    nextFocus?.focus()
                    toggleTopic(topic.id)
                  }}>
                    {topic.title}<Icon name="close" />
                  </button>
                </li>)}</ul>
              </div> : <details className="selected-topics">
                <summary>All topics <span>{course.topics.length}</span></summary>
                <ul className="available-topic-list">{course.topics.map(topic => <li key={topic.id}>{topic.title}</li>)}</ul>
              </details>}
            </section>
          <section className="panel last-session"><div className="panel-heading"><h2>Last session</h2><Icon name="chart" /></div>{courseHistory.length ? <><strong className="last-score">{summarizeSession(courseHistory[0]!, ALL_QUESTIONS).percentage}%<small>correct</small></strong><p>{dateFormat.format(courseHistory[0]!.finishedAt!)}</p><button className="text-button" onClick={() => setResultId(courseHistory[0]!.id)}>Review answers<Icon name="arrow" /></button></> : <><div className="empty-icon"><Icon name="chart" /></div><p>Your results will appear here when you finish a session.</p></>}</section></div>
        </div>
        <p className="page-footnote"><Icon name="shield" />Progress is saved in this browser. No account required.</p>
      </>}

      {view === 'practice' && active && current && <>
        <div className="page-heading"><div><h1>{active.mode === 'practice' ? 'Practice session' : 'Mock exam'}</h1><p>{active.courseId} · {topicTitle(current.topicId)}</p></div><div className={'timer-chip' + (remaining !== null && remaining < 60 ? ' urgent' : '')} role="timer" aria-label="Time remaining"><Icon name="clock" /><strong>{remaining === null ? 'Untimed' : time(remaining)}</strong></div></div>
        <div className="session-progress"><span>Question <strong>{active.currentIndex + 1}</strong> of {active.questionIds.length}</span><span>{Object.keys(active.answers).length} answered</span><progress value={Object.keys(active.answers).length} max={active.questionIds.length} aria-label="Answered questions" /></div>
        <article className="panel question-panel"><div className="question-meta"><span className={'sample-pill difficulty-' + current.difficulty}>{current.isDemo ? 'Legacy sample question' : DIFFICULTY_LABELS[current.difficulty]}</span><span>{current.type === 'boolean' ? 'True or false' : 'One correct answer'}</span></div><h2 ref={questionHeading} tabIndex={-1}><MathText>{current.prompt}</MathText></h2>{current.figure && <QuestionFigure kind={current.figure} />}{current.table && <QuestionTable table={current.table} />}
          <fieldset className="answer-options"><legend className="sr-only">Choose an answer</legend>{getOrderedOptions(current, active.id).map((option, index) => {
            const chosen = (recorded ?? selected) === option.id
            const correct = isFeedback && option.id === current.correctOptionId
            const wrong = isFeedback && chosen && !correct
            return <label key={option.id} className={'answer-option' + (chosen ? ' chosen' : '') + (correct ? ' correct' : '') + (wrong ? ' wrong' : '')}><input type="radio" name={current.id} checked={chosen} disabled={Boolean(recorded) || remaining === 0} onChange={() => setSelected(option.id)} value={option.id} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="option-content"><MathText>{option.text}</MathText></span>{correct ? <Icon name="checkCircle" /> : wrong ? <Icon name="close" /> : <span className="option-radio" />}</label>
          })}</fieldset>
          {isFeedback && <div className={'answer-feedback' + (recorded === current.correctOptionId ? ' is-correct' : '')} role="status"><h3><Icon name={recorded === current.correctOptionId ? 'checkCircle' : 'info'} />{recorded === current.correctOptionId ? 'Correct!' : 'Incorrect'}</h3><p><MathText>{current.explanation}</MathText></p><QuestionSources question={current} /></div>}
          <div className="question-actions"><button className="secondary-button" disabled={active.currentIndex === 0} onClick={() => setProgress(previous => ({ ...previous, active: { ...active, currentIndex: active.currentIndex - 1 } }))}><Icon name="chevron" className="rotate-back" />Previous</button><div>{!recorded && <button className="text-button skip-button" onClick={() => advance(active)}>Skip</button>}{recorded ? <button className="primary-button" onClick={() => advance(active)}>{active.currentIndex === active.questionIds.length - 1 ? 'View results' : 'Next question'}<Icon name="arrow" /></button> : <button className="primary-button" disabled={!selected || remaining === 0} onClick={submit}>{active.mode === 'practice' ? 'Check answer' : active.currentIndex === active.questionIds.length - 1 ? 'Submit and view results' : 'Submit and continue'}<Icon name="arrow" /></button>}</div></div>
        </article>
        <div className="session-bottom"><p>Answers are locked after submission. {active.mode === 'exam' ? 'Review the answers when the session ends.' : 'You can revisit questions to read the explanations.'}</p><button className="text-button" onClick={() => setConfirmEnd(true)}>End session</button></div>
        <div className="question-navigation" aria-label="Questions in this session">{active.questionIds.map((id, index) => <button key={id} aria-label={`Question ${index + 1}${active.answers[id] ? ', answered' : ', unanswered'}`} aria-current={active.currentIndex === index ? 'step' : undefined} className={active.answers[id] ? 'answered' : ''} onClick={() => setProgress(previous => ({ ...previous, active: { ...active, currentIndex: index } }))}>{index + 1}</button>)}</div>
      </>}

      {view === 'practice' && !active && result && summary && <>
        <div className="page-heading"><div><h1>Session complete</h1><p>{result.courseId} · {dateFormat.format(result.finishedAt!)}{result.endReason === 'timeout' ? ' · Time ran out' : ''}</p></div><button className="secondary-button" onClick={() => setResultId(null)}>New session<Icon name="arrow" /></button></div>
        <section className="panel result-overview"><div className="score-ring" style={{ '--score': `${summary.percentage}%` } as React.CSSProperties}><div><strong>{summary.percentage}%</strong><span>correct</span></div></div><div className="result-copy"><span className="sample-pill">{result.questionIds.some(id => questionById(id).isDemo) ? 'Legacy sample content' : 'Course-based practice'}</span><h2>{summary.correct} of {summary.total} correct</h2><p>{summary.answered} answered · {summary.total - summary.answered} unanswered · {time(summary.elapsedSeconds)} elapsed</p><p className="small-copy">Your score includes all questions, including unanswered ones.</p>{summary.correct < summary.total && <button className="primary-button" onClick={() => start(result.questionIds.filter(id => result.answers[id] !== questionById(id).correctOptionId))}><Icon name="refresh" />Retry missed and unanswered questions</button>}</div></section>
        <section className="panel topic-results"><div className="panel-heading"><h2>Results by topic</h2><span>Correct / total</span></div>{summary.topics.map(topic => <div key={topic.topicId} className="topic-result-row"><span>{topicTitle(topic.topicId)}</span><progress value={topic.correct} max={topic.total} aria-label={`${topicTitle(topic.topicId)}: ${topic.correct} of ${topic.total} correct`} /><strong>{topic.correct} / {topic.total}</strong></div>)}</section>
        <section className="answer-review"><div className="section-heading"><h2>Answers and explanations</h2><span>{countLabel(summary.total, 'question')}</span></div>{result.questionIds.map((id, index) => {
          const question = questionById(id), answer = result.answers[id], correct = answer === question.correctOptionId
          return <details className="panel review-item" key={id}><summary><span className={'review-marker' + (correct ? ' correct' : '')}><Icon name={correct ? 'check' : answer ? 'close' : 'info'} /></span><span><small>Question {index + 1} · {topicTitle(question.topicId)}</small><strong><MathText>{question.prompt}</MathText></strong></span><Icon name="chevron" /></summary><div className="review-body">{question.figure && <QuestionFigure kind={question.figure} />}{question.table && <QuestionTable table={question.table} />}<p><strong>Your answer:</strong> <MathText>{question.options.find(option => option.id === answer)?.text ?? 'Unanswered'}</MathText></p><p><strong>Correct answer:</strong> <MathText>{question.options.find(option => option.id === question.correctOptionId)?.text ?? ''}</MathText></p><p><MathText>{question.explanation}</MathText></p><QuestionSources question={question} /></div></details>
        })}</section>
      </>}

      {view === 'history' && <>
        <div className="page-heading"><div><h1>Results</h1><p>Your {courseId} sessions in this browser.</p></div><span className="page-tag">{countLabel(courseHistory.length, 'session')}</span></div>
        {courseHistory.length ? <><div className="history-metrics"><div className="metric-card"><Icon name="checkCircle" /><strong>{courseHistory.length}</strong><span>completed sessions</span></div><div className="metric-card"><Icon name="target" /><strong>{Math.round(courseHistory.reduce((sum, session) => sum + summarizeSession(session, ALL_QUESTIONS).percentage, 0) / courseHistory.length)}%</strong><span>average score</span></div><div className="metric-card"><Icon name="book" /><strong>{courseHistory.reduce((sum, session) => sum + Object.keys(session.answers).length, 0)}</strong><span>questions answered</span></div></div><section className="panel history-panel"><div className="panel-heading"><h2>Past sessions</h2><span>Most recent first</span></div>{courseHistory.map(session => { const stats = summarizeSession(session, ALL_QUESTIONS); return <button className="history-row" key={session.id} onClick={() => { setResultId(session.id); setView('practice') }} disabled={Boolean(active)}><span className="history-icon"><Icon name={session.mode === 'practice' ? 'book' : 'flag'} /></span><span><strong>{session.mode === 'practice' ? 'Practice' : 'Mock exam'} · {countLabel(session.questionIds.length, 'question')}</strong><small>{dateFormat.format(session.finishedAt!)} · {session.questionIds.some(id => questionById(id).isDemo) ? 'Legacy sample content' : 'Course-based'}</small></span><span className="history-score"><strong>{stats.percentage}%</strong><small>{stats.correct} of {stats.total} correct</small></span><Icon name="chevron" /></button>})}</section></> : <section className="panel empty-state"><span className="empty-icon large"><Icon name="chart" /></span><h2>No sessions yet</h2><p>Finish a session to see your score, answers, and explanations.</p><button className="primary-button" onClick={() => navigate('practice')}>{active ? 'Resume session' : 'Start your first session'}<Icon name="arrow" /></button></section>}
        <p className="page-footnote"><Icon name="shield" />Your history is stored in this browser.</p>
      </>}

      {view === 'syllabus' && <>
        <div className="page-heading"><div><h1>Syllabus</h1><p>{countLabel(course.topics.length, 'topic')} · {QUESTIONS.filter(question => question.courseId === courseId).length} questions · {countLabel(courseSources.length, 'source')}</p></div><span className="sample-pill">{courseId}</span></div>
        <section className="panel content-notice"><span className="notice-icon"><Icon name="book" /></span><div><h2>Lectures, group exercises, and notes</h2><p>Practice questions include answers and references to the relevant pages or sections of the course material.</p><small>{courseId === 'IN3230' ? 'The midterm C programming material is outside the scope of this question bank.' : 'The bank also includes multiple-choice and true-or-false questions adapted from past and mock exams from 2020 to 2023.'}</small></div></section>
        <div className="syllabus-grid">{course.topics.map((topic, index) => {
          const topicQuestions = QUESTIONS.filter(question => question.topicId === topic.id)
          return <section key={topic.id} className="panel syllabus-card"><span className="topic-index">{String(index + 1).padStart(2, '0')}</span><h2>{topic.title}</h2><p>{topic.description}</p>
            {topic.objectives?.length ? <ul className="topic-objectives">{topic.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul> : null}
            <div className="difficulty-counts">{(['easy', 'medium', 'hard'] as const).map(level => <span key={level} className={'difficulty-' + level}>{DIFFICULTY_LABELS[level]}<strong>{topicQuestions.filter(question => question.difficulty === level).length}</strong></span>)}</div>
            <footer><span>{countLabel(topicQuestions.length, 'question')}</span><button className="text-button" disabled={Boolean(active)} onClick={() => { setTopicIds([topic.id]); setDifficulty('all'); navigate('practice') }}>Practise this topic<Icon name="arrow" /></button></footer>
            {topic.sourcePaths?.length ? <details className="topic-source-list"><summary>Topic sources <span>{topic.sourcePaths.length}</span></summary><ul>{topic.sourcePaths.map(path => <li key={path}><strong>{SOURCE_INDEX.get(path)?.title ?? path.split('/').at(-1)}</strong><small>{path}</small></li>)}</ul></details> : null}
          </section>
        })}</div>
        <section className="panel sources-panel"><div className="panel-heading"><h2>Source library</h2><span className="quiet-badge">{countLabel(courseSources.length, 'document')}</span></div><p>Use these filenames to find the original course materials.</p><details className="source-catalog"><summary>Show sources</summary><ul>{courseSources.map(source => <li key={source.path}><span className="quiet-badge">{source.kind}</span><div><strong>{source.title}</strong><small>{source.path}</small></div></li>)}</ul></details></section>
      </>}
    </main>
    <dialog ref={endDialog} className="confirm-dialog" onCancel={() => setConfirmEnd(false)} onClose={() => setConfirmEnd(false)} aria-labelledby="end-title"><h2 id="end-title">End this session?</h2><p>Your submitted answers will be saved. Skipped questions count as unanswered.</p><div><button className="secondary-button" autoFocus onClick={() => setConfirmEnd(false)}>Resume session</button><button className="primary-button" onClick={() => active && finish(active, 'manual')}>End and view results</button></div></dialog>
  </div>
}
