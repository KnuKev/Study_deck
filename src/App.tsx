import { useEffect, useRef, useState } from 'react'
import { ALL_QUESTIONS, COURSES, QUESTIONS, QUESTION_INDEX, SOURCE_INDEX, SOURCES, LEGACY_TOPICS, DIFFICULTY_LABELS } from './data'
import { answerIds, answerQuestion, createSession, finishSession, getRemainingSeconds, getOrderedOptions, getPracticePool, requiredAnswerCount, summarizeSession } from './engine'
import type { QuestionFocus } from './engine'
import type { CourseId, Deck, DeckId, Difficulty, Question, Session, StudySetId } from './model'
import { loadProgress, saveProgress } from './storage'
import Icon from './Icon'
import QuestionFigure from './QuestionFigure'
import QuestionSources from './QuestionSources'
import QuestionTable from './QuestionTable'
import MathText from './MathText'
import { useSlidingIndicator } from './useSlidingIndicator'
import { deckQuestions, loadDecks, saveDecks } from './decks'
import DeckLibrary from './DeckLibrary'
import Results from './Results'
import KeyTerms from './KeyTerms'
import type { TermFilters } from './glossary'
import TopicSummaryDialog from './TopicSummaryDialog'
import type { Period } from './resultsPeriod'
import { examSelectionLabel, getPastExamPool, PAST_EXAMS } from './pastExams'
import { getPracticePriority, IN3050_EXAM_GUIDANCE } from './examGuidance'
import ExamPreparationGuidance from './ExamPreparationGuidance'
import type { ExamSelection } from './pastExams'

type View = 'practice' | 'history' | 'syllabus' | 'decks' | 'terms'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const number = (value: number) => value.toLocaleString('en-GB')
const countLabel = (count: number, noun: string) => `${number(count)} ${noun}${count === 1 ? '' : 's'}`
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.max(0, seconds % 60).toString().padStart(2, '0')}`
const topicTitle = (id: string) => [...COURSES.flatMap(course => course.topics), ...LEGACY_TOPICS].find(topic => topic.id === id)?.title ?? id
const questionsFor = (session: Session) => session.deck ? deckQuestions(session.deck) : ALL_QUESTIONS
const sessionTitle = (session: Session) => session.deck?.title ?? session.courseId
const sessionTopic = (session: Session, id: string) => session.deck ? 'Custom questions' : topicTitle(id)
const hasLegacyQuestions = (session: Session) => session.questionIds.some(id => QUESTION_INDEX.get(id)?.isDemo)

function AnswerText({ text, code }: { text: string; code?: boolean }) {
  if (code) return <code className="answer-code">{text}</code>
  return <MathText>{text}</MathText>
}

function AnswerReview({ question, answer }: { question: Question; answer?: string }) {
  const ids = answerIds(answer)
  const selected = question.options.filter(option => ids.includes(option.id))
  if (!selected.length) return <>Unanswered</>
  return selected.map((option, index) => <span key={option.id}>
    {index > 0 && ' · '}<AnswerText text={option.text} code={question.codeOptions} />
  </span>)
}

function QuestionMaterial({ question }: { question: Question }) {
  return <>
    {question.code && <pre className="question-code" tabIndex={0} aria-label="Code example"><code>{question.code}</code></pre>}
    {question.figure && <QuestionFigure kind={question.figure} />}
    {question.table && <QuestionTable table={question.table} />}
  </>
}

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
  const [termFilters, setTermFilters] = useState<TermFilters>({
    courseId: 'all', topicId: 'all', query: '', order: 'topic',
  })
  const [courseId, setCourseId] = useState<CourseId>(() => active?.courseId === 'IN3230' ? 'IN3230' : 'IN3050')
  const [decks, setDecks] = useState(loadDecks)
  const savedDecks = useRef(decks)
  const [deckId, setDeckId] = useState<DeckId | null>(() => active?.deck?.id ?? null)
  const [resultsSource, setResultsSource] = useState<StudySetId | null>(null)
  const [period, setPeriod] = useState<Period>('all')
  const [from, setFrom] = useState('')
  const [through, setThrough] = useState('')
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [summaryTopicId, setSummaryTopicId] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [focus, setFocus] = useState<QuestionFocus>('mixed')
  const [questionSource, setQuestionSource] = useState<'bank' | 'exams'>('bank')
  const [examSelection, setExamSelection] = useState<ExamSelection>('fall')
  const [currentExamTopicsOnly, setCurrentExamTopicsOnly] = useState(true)
  const [mode, setMode] = useState<'practice' | 'exam'>('practice')
  const [duration, setDuration] = useState<number | null>(15)
  const [count, setCount] = useState(10)
  const [theme, setTheme] = useState(readTheme)
  const [now, setNow] = useState(Date.now)
  const [selected, setSelected] = useState<string[]>([])
  const [resultId, setResultId] = useState<string | null>(null)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const endDialog = useRef<HTMLDialogElement>(null)
  const selectionHeading = useRef<HTMLHeadingElement>(null)
  const course = COURSES.find(item => item.id === courseId)!
  const summaryTopic = course.topics.find(topic => topic.id === summaryTopicId)
  const selectedTopics = course.topics.filter(topic => topicIds.includes(topic.id))
  const deck = decks.find(item => item.id === deckId)
  const studySetId = deck?.id ?? courseId
  const courseQuestions = getPracticePool(QUESTIONS, courseId, [])
  const examOnly = !deck && courseId === 'IN3050' && questionSource === 'exams'
  const pool = deck ? deckQuestions(deck) : examOnly
    ? getPastExamPool(QUESTIONS, examSelection, currentExamTopicsOnly)
    : getPracticePool(QUESTIONS, courseId, topicIds, difficulty, focus, mode)
  const availableTopicIds = new Set(courseQuestions.map(question => question.topicId))
  const practiceTopics = course.topics.filter(topic => availableTopicIds.has(topic.id))
  const courseSources = SOURCES.filter(source => source.courseId === courseId)
  const countOption = count > pool.length ? 0 : count
  const selectedCount = countOption === 0 ? pool.length : countOption
  const result = history.find(item => item.id === resultId)
  const courseHistory = history.filter(item => item.courseId === studySetId)
  const lastScore = courseHistory[0] ? summarizeSession(courseHistory[0], questionsFor(courseHistory[0])) : null
  const resultQuestions = result ? questionsFor(result) : ALL_QUESTIONS
  const resultIndex = result?.deck ? new Map(resultQuestions.map(question => [question.id, question])) : QUESTION_INDEX
  const showSetup = view === 'practice' && !active && !result
  const mainNav = useSlidingIndicator<HTMLElement>(view === 'decks' || view === 'terms' ? null : view, '[aria-current="page"]')
  const sourceOptions = useSlidingIndicator<HTMLDivElement>(showSetup && !deck && courseId === 'IN3050' ? questionSource : null)
  const durationOptions = useSlidingIndicator<HTMLDivElement>(showSetup ? duration ?? 'untimed' : null)
  const difficultyOptions = useSlidingIndicator<HTMLDivElement>(showSetup && !deck && !examOnly ? difficulty : null)
  const countOptions = useSlidingIndicator<HTMLDivElement>(showSetup ? countOption : null)
  const summary = result ? summarizeSession(result, resultQuestions) : null
  const remaining = active ? getRemainingSeconds(active, now) : null
  const activeQuestions = active ? questionsFor(active) : ALL_QUESTIONS
  const current = active ? activeQuestions.find(question => question.id === active.questionIds[active.currentIndex]) : null
  const recorded = active && current ? active.answers[current.id] : undefined
  const isFeedback = Boolean(active?.mode === 'practice' && recorded)
  const answerCount = current ? requiredAnswerCount(current) : 1
  const canSubmit = selected.length === answerCount && remaining !== 0

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
        setView(previous => previous === 'decks' ? previous : 'practice')
        setConfirmEnd(false)
      }
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [active])

  useEffect(() => {
    setSelected([])
    if (current) questionHeading.current?.focus()
  }, [current?.id])

  useEffect(() => {
    if (confirmEnd) endDialog.current?.showModal()
    else endDialog.current?.close()
  }, [confirmEnd])

  function chooseCourse(id: CourseId) {
    setCourseId(id)
    setDeckId(null)
    setResultsSource(null)
    if (view === 'decks') setView('practice')
    if (view === 'terms') setTermFilters(previous => ({ ...previous, courseId: id, topicId: 'all' }))
    setTopicIds([])
    setFocus('mixed')
    setQuestionSource('bank')
    setDifficulty('all')
    setCount(id === 'IN3050' && mode === 'exam' ? IN3050_EXAM_GUIDANCE.format.approximateQuestions : 10)
    if (id === 'IN3050' && mode === 'exam') setDuration(null)
    setResultId(null)
  }

  function chooseQuestionSource(next: 'bank' | 'exams') {
    setQuestionSource(next)
    setTopicIds([])
    setDifficulty('all')
    setCount(next === 'exams' || mode === 'exam' ? IN3050_EXAM_GUIDANCE.format.approximateQuestions : 10)
    if (next === 'exams') setDuration(null)
  }

  function chooseMode(next: 'practice' | 'exam') {
    setMode(next)
    if (next === 'exam' && !deck && courseId === 'IN3050') {
      setCount(IN3050_EXAM_GUIDANCE.format.approximateQuestions)
      setDuration(null)
    }
  }

  function toggleTopic(id: string) {
    setTopicIds(previous => previous.includes(id) ? previous.filter(topic => topic !== id) : [...previous, id])
  }

  function updateDecks(update: (current: Deck[]) => Deck[]) {
    const next = update(savedDecks.current)
    if (!saveDecks(next)) return false
    savedDecks.current = next
    setDecks(next)
    setDeckId(current => next.some(item => item.id === current) ? current : null)
    return true
  }

  function practiseDeck(id: DeckId) {
    setDeckId(id)
    setCount(10)
    setResultsSource(null)
    navigate('practice')
  }

  function start(retry?: Session) {
    const sourceDeck = retry ? retry.deck : deck
    const ids = retry?.questionIds.filter(id => !resultIndex.get(id)?.unscored && retry.answers[id] !== resultIndex.get(id)?.correctOptionId)
    const shuffled = createSession({
      courseId: retry?.courseId ?? studySetId,
      mode: retry ? 'practice' : mode,
      questionIds: ids ?? pool.map(question => question.id),
      durationMinutes: retry ? null : duration,
      priority: !retry && !deck && !examOnly
        ? new Map(pool.map(question => [question.id, getPracticePriority(question)]))
        : undefined,
    })
    const session = retry ? shuffled : { ...shuffled, questionIds: shuffled.questionIds.slice(0, selectedCount) }
    if (sourceDeck) {
      const used = new Set(session.questionIds)
      session.deck = { ...sourceDeck, questions: sourceDeck.questions.filter(question => used.has(question.id)) }
    }
    setProgress(previous => ({ ...previous, active: session }))
    setResultId(null)
    setSelected([])
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
    if (!active || !current || !canSubmit || recorded) return
    const updated = answerQuestion(active, current.id, selected.join(','), activeQuestions)
    if (updated.finishedAt !== null) finish(updated, 'timeout')
    else if (active.mode === 'exam') advance(updated)
    else setProgress(previous => ({ ...previous, active: updated }))
  }

  function practiseTopic(id: string) {
    setTopicIds([id])
    setFocus('mixed')
    setQuestionSource('bank')
    setDifficulty('all')
    setSummaryTopicId(null)
    navigate('practice')
  }

  function navigate(next: View) {
    setView(next)
    setResultId(null)
    if (next === 'decks' || next === 'terms') window.scrollTo(0, 0)
  }

  const resultsSources = new Map<StudySetId, string>(COURSES.map(item => [item.id, `${item.id} · ${item.shortTitle}`]))
  for (const item of decks) resultsSources.set(item.id, item.title)
  for (const item of history) {
    if (item.deck && !resultsSources.has(item.courseId)) resultsSources.set(item.courseId, `${item.deck.title} (deleted)`)
  }
  const requestedSource = resultsSource ?? studySetId
  const sourceId = resultsSources.has(requestedSource) ? requestedSource : studySetId

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="floating-toolbar">
      <nav ref={mainNav} className="main-nav sliding-indicator" aria-label="Main navigation">
        {([{ id: 'practice', label: 'Practice', icon: 'book' }, { id: 'history', label: 'Results', icon: 'chart' }, { id: 'syllabus', label: 'Syllabus', icon: 'layers' }] as const).map(item => <button key={item.id} className={'nav-item' + (view === item.id ? ' is-current' : '')} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon name={item.icon} />{item.label}</button>)}
      </nav>
      <div className="display-controls"><button className="icon-button theme-toggle" title={theme === 'dark' ? 'Light theme' : 'Dark theme'} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button></div>
    </header>

    <div className="workspace">
    <aside className="sidebar" aria-label="Courses and topics">
      <div className="sidebar-title"><h2>Courses</h2></div>
      <div className="course-options">
        {COURSES.map(item => <button key={item.id} disabled={Boolean(active)} className={'course-option' + (!deck && courseId === item.id ? ' selected' : '')} onClick={() => chooseCourse(item.id)} aria-pressed={!deck && courseId === item.id}><span className="course-symbol"><Icon name={item.id === 'IN3050' ? 'brain' : 'network'} /></span><span><strong>{item.id}</strong><small>{item.shortTitle}</small></span><Icon name="chevron" /></button>)}
      </div>
      <button className={'deck-link' + (view === 'terms' ? ' selected' : '')} onClick={() => navigate('terms')} aria-current={view === 'terms' ? 'page' : undefined}>
        <Icon name="book" />Key terms<Icon name="chevron" />
      </button>
      <button className={'deck-link' + (view === 'decks' ? ' selected' : '')} onClick={() => navigate('decks')} aria-current={view === 'decks' ? 'page' : undefined}>
        <Icon name="layers" />My decks<Icon name="chevron" />
      </button>
      {!deck && (view === 'practice' || view === 'syllabus') && <>
      <div className="sidebar-section-heading"><h3>Topics</h3></div>
      <button className={'all-topics' + (!topicIds.length ? ' selected' : '')} onClick={() => setTopicIds([])} disabled={Boolean(active) || examOnly} aria-pressed={!topicIds.length}><Icon name="layers" />All topics<span>{courseQuestions.length}</span></button>
      <div className="topic-options">{practiceTopics.map(topic => <label key={topic.id} className={topicIds.includes(topic.id) ? 'selected' : ''}><input type="checkbox" checked={topicIds.includes(topic.id)} disabled={Boolean(active) || examOnly} onChange={() => toggleTopic(topic.id)} /><span>{topic.title}</span><small>{courseQuestions.filter(question => question.topicId === topic.id).length}</small></label>)}</div>
      {(active || examOnly) && <p className="sidebar-hint">
        {active ? 'Topics are locked during a session.' : 'Topics are fixed by the exam selection.'}
      </p>}
      </>}
    </aside>

    <main id="main-content" className="main-content">
      {!storageAvailable && <div className="storage-notice" role="alert"><Icon name="info" /><span>Your progress could not be saved. Closing this page may lose your session.</span></div>}
      {active && view !== 'practice' && <button className="resume-banner" onClick={() => setView('practice')}><Icon name="play" /><span>Session in progress for {sessionTitle(active)}</span><strong>{remaining === null ? 'No time limit' : time(remaining)}</strong><span>Resume<Icon name="arrow" /></span></button>}

      {view === 'terms' && <KeyTerms filters={termFilters} onChange={setTermFilters} />}

      {view === 'decks' && <DeckLibrary decks={decks} sessionActive={Boolean(active)} onChange={updateDecks} onPractice={practiseDeck} />}

      {showSetup && <>
        <div className="page-heading"><h1>Practice</h1></div>
        <div className="overview-grid">
          <div className="overview-feature"><Icon name={deck ? 'layers' : courseId === 'IN3050' ? 'brain' : 'network'} /><h2>{deck?.title ?? courseId}</h2>{!deck && <p>{course.title}</p>}</div>
          <div className="metric-card"><Icon name="book" /><strong aria-live="polite" aria-atomic="true"><span className="sr-only">Available questions </span>{pool.length}</strong><span>available questions</span></div>
          <div className="metric-card"><Icon name="checkCircle" /><strong>{number(courseHistory.length)}</strong><span>completed sessions</span></div>
        </div>
        <div className="setup-grid">
          <section className="panel session-setup"><div className="panel-heading"><h2>Set up a session</h2><Icon name="target" /></div>
            <fieldset><legend>Mode</legend><div className="mode-options"><button className={mode === 'practice' ? 'selected' : ''} aria-pressed={mode === 'practice'} onClick={() => chooseMode('practice')}><Icon name="book" /><strong>Practice</strong><span>See answers and explanations as you go.</span>{mode === 'practice' && <Icon name="checkCircle" />}</button><button className={mode === 'exam' ? 'selected' : ''} aria-pressed={mode === 'exam'} onClick={() => chooseMode('exam')}><Icon name="flag" /><strong>Mock exam</strong><span>Review your answers at the end.</span>{mode === 'exam' && <Icon name="checkCircle" />}</button></div></fieldset>
            {!deck && courseId === 'IN3050' && mode === 'exam' && <p className="field-hint">The final exam has about 50 multiple-choice questions.</p>}
            {!deck && <div className="question-focus">
              {courseId === 'IN3050' && <fieldset className="question-source">
                <legend>Question source</legend>
                <div ref={sourceOptions} className="segmented source-options sliding-indicator">
                  <button aria-pressed={questionSource === 'bank'} onClick={() => chooseQuestionSource('bank')}>Question bank</button>
                  <button aria-pressed={questionSource === 'exams'} onClick={() => chooseQuestionSource('exams')}>Past exams</button>
                </div>
              </fieldset>}
              {examOnly ? <>
                <label className="form-field">Exam
                  <span className="question-focus-control">
                    <select value={examSelection} onChange={event => setExamSelection(event.target.value as ExamSelection)}>
                      <option value="fall">Fall 2024 and Fall 2025</option>
                      {PAST_EXAMS.map(exam => <option key={exam.id} value={exam.id}>{exam.label}</option>)}
                      <option value="all">All past exams</option>
                    </select>
                    <Icon name="chevron" />
                  </span>
                </label>
                <label className="exam-scope-filter"><input type="checkbox" checked={currentExamTopicsOnly} onChange={event => setCurrentExamTopicsOnly(event.target.checked)} />Current exam topics only</label>
                {!currentExamTopicsOnly && <p className="field-hint">Full papers include AI Philosophy and other historical topics.</p>}
              </> : <label className="form-field">Question focus
                <span className="question-focus-control">
                  <select value={focus} onChange={event => setFocus(event.target.value === 'prep' ? 'prep' : 'mixed')}>
                    <option value="mixed">Mixed practice</option>
                    <option value="prep">{courseId === 'IN3050' ? 'Exam prep' : 'Application-layer exam prep'}</option>
                  </select>
                  <Icon name="chevron" />
                </span>
              </label>}
            </div>}
            <fieldset><legend><Icon name="clock" />Duration</legend><div ref={durationOptions} className="segmented duration-options sliding-indicator">{[15, 30, 45, 60, null].map(minutes => <button key={minutes ?? 'none'} aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes === null ? 'Untimed' : `${minutes} min`}</button>)}</div>{duration !== null && <p className="field-hint">The timer keeps running if you leave.</p>}</fieldset>
            {!deck && !examOnly && <fieldset><legend>Difficulty</legend><div ref={difficultyOptions} className="segmented difficulty-options sliding-indicator">{(['all', 'easy', 'medium', 'hard'] as const).map(level => <button key={level} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>{level === 'all' ? 'Mixed' : DIFFICULTY_LABELS[level]}</button>)}</div></fieldset>}
            <fieldset><legend>Number of questions</legend><div ref={countOptions} className="segmented count-options sliding-indicator">{[5, 10, 20, !deck && courseId === 'IN3050' ? 50 : 40, 0].map(amount => <button key={amount} disabled={amount > pool.length} aria-pressed={amount === countOption} onClick={() => setCount(amount)}>{amount === 0 ? 'All' : amount}</button>)}</div></fieldset>
            <div className="session-start"><span><strong>{countLabel(selectedCount, 'question')}</strong><small>{deck ? 'Custom deck' : examOnly ? examSelectionLabel(examSelection) : topicIds.length ? `${countLabel(topicIds.length, 'topic')} selected` : 'All topics'} · {duration ? `${duration} minutes` : 'No time limit'}</small></span><button className="primary-button" disabled={!selectedCount} onClick={() => start()}>Start session<Icon name="arrow" /></button></div>
          </section>
          <div className="setup-aside">
            <section className="panel selection-panel">
              <div className="panel-heading"><h2 ref={selectionHeading} tabIndex={-1}>Question pool</h2></div>
              <div className="selection-counts"><span><Icon name="layers" />Multiple choice<strong>{pool.filter(question => question.type !== 'boolean').length}</strong></span>{!deck && <span><Icon name="checkCircle" />True or false<strong>{pool.filter(question => question.type === 'boolean').length}</strong></span>}</div>
              {!deck && !examOnly && selectedTopics.length > 0 && <div className="selected-topics">
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
              </div>}
            </section>
            {courseHistory[0] && <section className="panel last-session">
              <div className="panel-heading"><h2>Last session</h2><Icon name="chart" /></div>
              <strong className="last-score">{lastScore?.total ? `${lastScore.percentage}%` : '—'}<small>{lastScore?.total ? 'correct' : 'not scored'}</small></strong>
              <p>{dateFormat.format(courseHistory[0].finishedAt!)}</p>
              <button className="text-button" onClick={() => { setResultId(courseHistory[0]!.id); window.scrollTo(0, 0) }}>Review answers<Icon name="arrow" /></button>
            </section>}
          </div>
        </div>
      </>}

      {view === 'practice' && active && current && <>
        <div className="page-heading"><div><h1>{active.mode === 'practice' ? 'Practice session' : 'Mock exam'}</h1><p>{sessionTitle(active)}{!active.deck && ` · ${topicTitle(current.topicId)}`}</p></div><div className={'timer-chip' + (remaining !== null && remaining < 60 ? ' urgent' : '')} role="timer" aria-label="Time remaining"><Icon name="clock" /><strong>{remaining === null ? 'Untimed' : time(remaining)}</strong></div></div>
        <div className="session-progress"><span>Question <strong>{active.currentIndex + 1}</strong> of {active.questionIds.length}</span><span>{Object.keys(active.answers).length} answered</span><progress value={Object.keys(active.answers).length} max={active.questionIds.length} aria-label="Answered questions" /></div>
        <article className="panel question-panel">{!active.deck && <div className="question-meta"><span className={'sample-pill difficulty-' + current.difficulty}>{current.isDemo ? 'Legacy sample question' : DIFFICULTY_LABELS[current.difficulty]}</span>{current.trial2025 && current.examYear === 2024 ? <span>2024 exam · 2025 trial</span> :
            current.trial2025 ? <span>2025 trial exam</span> : current.examYear && <span>{current.examYear} exam</span>}
          {current.unscored && <span>Not scored · source issue</span>}{current.writtenAdaptation && <span>Adapted written prompt</span>}{current.examPrep && <span>Exam prep</span>}
          {current.type === 'multi' && <span>Choose {answerCount} answers</span>}</div>}<h2 ref={questionHeading} tabIndex={-1}><MathText>{current.prompt}</MathText></h2><QuestionMaterial question={current} />
          <fieldset className="answer-options"><legend className="sr-only">{current.type === 'multi' ? `Choose ${answerCount} answers` : 'Choose an answer'}</legend>{getOrderedOptions(current, active.id).map((option, index) => {
            const chosen = (recorded ? answerIds(recorded) : selected).includes(option.id)
            const correct = isFeedback && !current.unscored && answerIds(current.correctOptionId).includes(option.id)
            const wrong = isFeedback && !current.unscored && chosen && !correct
            return <label key={option.id} className={'answer-option' + (chosen ? ' chosen' : '') + (correct ? ' correct' : '') + (wrong ? ' wrong' : '')}><input type={current.type === 'multi' ? 'checkbox' : 'radio'} name={current.id} checked={chosen}
              disabled={Boolean(recorded) || remaining === 0 || (current.type === 'multi' && !chosen && selected.length === answerCount)}
              onChange={event => {
                const { checked } = event.currentTarget
                setSelected(previous => current.type === 'multi'
                  ? checked ? [...previous, option.id] : previous.filter(id => id !== option.id)
                  : [option.id])
              }} value={option.id} /><span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="option-content"><AnswerText text={option.text} code={current.codeOptions} /></span>{correct ? <Icon name="checkCircle" /> : wrong ? <Icon name="close" /> : <span className={current.type === 'multi' ? 'option-radio option-checkbox' : 'option-radio'} />}</label>
          })}</fieldset>
          {isFeedback && <div className={'answer-feedback' + (!current.unscored && recorded === current.correctOptionId ? ' is-correct' : '')} role="status"><h3><Icon name={!current.unscored && recorded === current.correctOptionId ? 'checkCircle' : 'info'} />{current.unscored ? 'Not scored · source issue' : recorded === current.correctOptionId ? 'Correct!' : 'Incorrect'}</h3>{current.explanation && <p><MathText>{current.explanation}</MathText></p>}{!active.deck && <QuestionSources question={current} />}</div>}
          <div className="question-actions"><button className="secondary-button" disabled={active.currentIndex === 0} onClick={() => setProgress(previous => ({ ...previous, active: { ...active, currentIndex: active.currentIndex - 1 } }))}><Icon name="chevron" className="rotate-back" />Previous</button><div>{!recorded && <button className="text-button skip-button" onClick={() => advance(active)}>Skip</button>}{recorded ? <button className="primary-button" onClick={() => advance(active)}>{active.currentIndex === active.questionIds.length - 1 ? 'View results' : 'Next question'}<Icon name="arrow" /></button> : <button className="primary-button" disabled={!canSubmit} onClick={submit}>{active.mode === 'practice' ? 'Check answer' : active.currentIndex === active.questionIds.length - 1 ? 'Submit and view results' : 'Submit and continue'}<Icon name="arrow" /></button>}</div></div>
        </article>
        <div className="session-bottom"><button className="text-button" onClick={() => setConfirmEnd(true)}>End session</button></div>
        <div className="question-navigation" aria-label="Questions in this session">{active.questionIds.map((id, index) => <button key={id} aria-label={`Question ${index + 1}${active.answers[id] ? ', answered' : ', unanswered'}`} aria-current={active.currentIndex === index ? 'step' : undefined} className={active.answers[id] ? 'answered' : ''} onClick={() => setProgress(previous => ({ ...previous, active: { ...active, currentIndex: index } }))}>{index + 1}</button>)}</div>
      </>}

      {view === 'practice' && !active && result && summary && <>
        <div className="page-heading"><div><h1>Session complete</h1><p>{sessionTitle(result)} · {dateFormat.format(result.finishedAt!)}{result.endReason === 'timeout' ? ' · Time ran out' : ''}</p></div><button className="secondary-button" onClick={() => setResultId(null)}>New session<Icon name="arrow" /></button></div>
        <section className="panel result-overview"><div className="score-ring" style={{ '--score': `${summary.percentage}%` } as React.CSSProperties}><div><strong>{summary.total ? `${summary.percentage}%` : '—'}</strong><span>{summary.total ? 'correct' : 'not scored'}</span></div></div><div className="result-copy">{hasLegacyQuestions(result) && <span className="sample-pill">Legacy sample content</span>}<h2>{summary.total ? `${summary.correct} of ${summary.total} correct` : 'No scored questions'}</h2><p>{summary.answered} answered · {summary.total - summary.answered} unanswered · {time(summary.elapsedSeconds)} elapsed</p>{summary.unscored > 0 && <p>{summary.unscored} {summary.unscored === 1 ? 'source issue excluded' : 'source issues excluded'} from the score.</p>}{summary.correct < summary.total && <button className="primary-button" onClick={() => start(result)}><Icon name="refresh" />Retry missed and unanswered questions</button>}</div></section>
        <section className="panel topic-results"><div className="panel-heading"><h2>Results by topic</h2><span>Correct / total</span></div>{summary.topics.map(topic => <div key={topic.topicId} className="topic-result-row"><span>{sessionTopic(result, topic.topicId)}</span><progress value={topic.correct} max={topic.total} aria-label={`${sessionTopic(result, topic.topicId)}: ${topic.correct} of ${topic.total} correct`} /><strong>{topic.correct} / {topic.total}</strong></div>)}</section>
        <section className="answer-review"><div className="section-heading"><h2>Answers and explanations</h2><span>{countLabel(result.questionIds.length, 'question')}</span></div>{result.questionIds.map((id, index) => {
          const question = resultIndex.get(id)!, answer = result.answers[id], correct = !question.unscored && answer === question.correctOptionId
          return <details className="panel review-item" key={id}><summary><span className={'review-marker' + (question.unscored ? ' unscored' : correct ? ' correct' : '')}><Icon name={question.unscored ? 'info' : correct ? 'check' : answer ? 'close' : 'info'} /></span><span><small>Question {index + 1} · {sessionTopic(result, question.topicId)}</small><strong><MathText>{question.prompt}</MathText></strong></span><Icon name="chevron" /></summary><div className="review-body"><QuestionMaterial question={question} /><p><strong>Your answer:</strong> <AnswerReview question={question} answer={answer} /></p>{question.unscored ? <p><strong>Not scored · source issue</strong></p> : <p><strong>{question.type === 'multi' ? 'Correct answers:' : 'Correct answer:'}</strong> <AnswerReview question={question} answer={question.correctOptionId} /></p>}{question.explanation && <p><MathText>{question.explanation}</MathText></p>}{!result.deck && <QuestionSources question={question} />}</div></details>
        })}</section>
      </>}

      {view === 'history' && <Results
        rows={history.filter(session => session.courseId === sourceId).map(session => ({
          session,
          score: summarizeSession(session, questionsFor(session)),
          legacy: hasLegacyQuestions(session),
        }))}
        sources={Array.from(resultsSources, ([id, title]) => ({ id, title }))}
        sourceId={sourceId}
        onSource={setResultsSource}
        period={period}
        from={from}
        through={through}
        onPeriod={setPeriod}
        onFrom={setFrom}
        onThrough={setThrough}
        sessionActive={Boolean(active)}
        today={new Date()}
        onReview={session => { setResultId(session.id); setView('practice'); window.scrollTo(0, 0) }}
      />}

      {view === 'syllabus' && deck && <div className="page-heading"><div><h1>Syllabus</h1><p>Select a course to view its syllabus.</p></div></div>}
      {view === 'syllabus' && !deck && <>
        <div className="page-heading"><div><h1>Syllabus</h1><p>{countLabel(practiceTopics.length, 'topic')} · {courseQuestions.length} questions</p></div></div>
        {courseId === 'IN3050' && <ExamPreparationGuidance />}
        {courseId === 'IN3230' && <p className="syllabus-scope">Midterm C programming is outside this question bank.</p>}
        <div className="syllabus-grid">{practiceTopics.map(topic => {
          const topicQuestions = courseQuestions.filter(question => question.topicId === topic.id)
          return <section key={topic.id} className="panel syllabus-card"><h2>{topic.title}</h2>
            {topic.objectives?.length ? <ul className="topic-objectives">{topic.objectives.map(objective => <li key={objective}>{objective}</li>)}</ul> : <p>{topic.description}</p>}
            <div className="difficulty-counts">{(['easy', 'medium', 'hard'] as const).map(level => <span key={level} className={'difficulty-' + level}>{DIFFICULTY_LABELS[level]}<strong>{topicQuestions.filter(question => question.difficulty === level).length}</strong></span>)}</div>
            <footer className="syllabus-topic-actions">
              <span>{countLabel(topicQuestions.length, 'question')}</span>
              <div>
                {topic.summary && <button className="secondary-button" onClick={() => setSummaryTopicId(topic.id)}>Summary of this topic</button>}
                <button className="text-button" disabled={Boolean(active)} onClick={() => practiseTopic(topic.id)}>Practise this topic<Icon name="arrow" /></button>
              </div>
            </footer>
            {topic.sourcePaths?.length ? <details className="topic-source-list"><summary>Topic sources <span>{topic.sourcePaths.length}</span></summary><ul>{topic.sourcePaths.map(path => <li key={path}><strong>{SOURCE_INDEX.get(path)?.title ?? path.split('/').at(-1)}</strong><small>{path}</small></li>)}</ul></details> : null}
          </section>
        })}</div>
        <section className="panel sources-panel"><div className="panel-heading"><h2>Source library</h2></div><details className="source-catalog"><summary>Show sources</summary><ul>{courseSources.map(source => <li key={source.path}><span className="quiet-badge">{source.kind}</span><div><strong>{source.title}</strong><small>{source.path}</small></div></li>)}</ul></details></section>
      </>}
    </main>
    </div>
    <TopicSummaryDialog
      topic={summaryTopic ?? null}
      sessionActive={Boolean(active)}
      onClose={() => setSummaryTopicId(null)}
      onPractise={practiseTopic}
    />
    <dialog ref={endDialog} className="confirm-dialog" onCancel={() => setConfirmEnd(false)} onClose={() => setConfirmEnd(false)} aria-labelledby="end-title"><h2 id="end-title">End this session?</h2><p>Your submitted answers will be saved. Skipped questions count as unanswered.</p><div><button className="secondary-button" autoFocus onClick={() => setConfirmEnd(false)}>Resume session</button><button className="primary-button" onClick={() => active && finish(active, 'manual')}>End and view results</button></div></dialog>
  </div>
}
