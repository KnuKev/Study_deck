import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { limits, MAX_DECK_FILE_BYTES, MAX_OPTIONS, MAX_QUESTIONS, parseDeckFile, serializeDeck, validateDeck } from './decks'
import type { Deck, DeckId, DeckQuestion } from './model'
import Icon from './Icon'

interface Props {
  decks: Deck[]
  sessionActive: boolean
  onChange: (update: (decks: Deck[]) => Deck[]) => boolean
  onPractice: (id: DeckId) => void
}

function blankQuestion(): DeckQuestion {
  return { id: crypto.randomUUID(), prompt: '', options: ['', ''], correctIndex: 0, explanation: '' }
}

function downloadDeck(deck: Deck) {
  const file = new Blob([serializeDeck(deck)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `${deck.title.replace(/[\\/:*?"<>|]/g, '_')}.study-deck.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DeckLibrary({ decks, sessionActive, onChange, onPractice }: Props) {
  const [draft, setDraft] = useState<Deck | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  function edit(deck: Deck) {
    setDraft(deck)
    setError('')
    setMessage('')
  }

  function updateQuestion(id: string, update: Partial<DeckQuestion>) {
    setDraft(previous => previous && {
      ...previous,
      questions: previous.questions.map(question => question.id === id ? { ...question, ...update } : question),
    })
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    try {
      const deck = validateDeck(draft)
      if (new Blob([serializeDeck(deck)]).size > MAX_DECK_FILE_BYTES) {
        throw new Error('This deck is too large to export. Split it into smaller decks.')
      }
      if (!onChange(current => current.some(item => item.id === deck.id)
        ? current.map(item => item.id === deck.id ? deck : item)
        : [...current, deck])) throw new Error('The browser could not save this deck. Free up browser storage or allow site data and try again.')
      setDraft(null)
      setError('')
      setMessage(`Saved “${deck.title}”.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the deck.')
    }
  }

  async function importDeck(file: File) {
    setImporting(true)
    setError('')
    setMessage('')
    try {
      if (file.size > MAX_DECK_FILE_BYTES) throw new Error('The file is too large. Study Deck JSON files can be up to 1 MB.')
      const deck = parseDeckFile(await file.text())
      if (!onChange(current => [...current, deck])) throw new Error('The browser could not save the imported deck.')
      setMessage(`Imported “${deck.title}” as a new deck.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import the deck.')
    } finally {
      setImporting(false)
    }
  }

  function remove(deck: Deck) {
    if (!window.confirm(`Delete “${deck.title}” from this browser? Past results will still be available.`)) return
    setMessage('')
    if (onChange(current => current.filter(item => item.id !== deck.id))) {
      setError('')
      setMessage(`Deleted “${deck.title}”.`)
    } else {
      setError('The browser could not delete this deck.')
    }
  }

  return <>
    <div className="page-heading"><div><h1>My decks</h1><p>Create question sets for any subject.</p></div></div>
    {draft ? <form className="deck-editor" onSubmit={save}>
      <section className="panel deck-editor-header">
        <label className="form-field">Deck name
          <input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} maxLength={limits.title} required />
        </label>
      </section>
      {draft.questions.map((question, index) => <fieldset key={question.id} className="panel deck-question">
        <legend>Question {index + 1}</legend>
        <label className="form-field">Prompt
          <textarea value={question.prompt} rows={2} required maxLength={limits.prompt} onChange={event => updateQuestion(question.id, { prompt: event.target.value })} />
        </label>
        <div className="form-field">
          <span>Answers</span>
          {question.options.map((option, optionIndex) => <div className="form-field deck-answer" key={optionIndex}>
            <label className="form-field">Answer {optionIndex + 1}
            <input value={option} required maxLength={limits.option} onChange={event => {
              const value = event.target.value
              updateQuestion(question.id, { options: question.options.map((text, i) => i === optionIndex ? value : text) })
            }} />
            </label>
            {question.options.length > 2 && <button type="button" className="text-button" aria-label={`Remove answer ${optionIndex + 1} from question ${index + 1}`} onClick={() => updateQuestion(question.id, {
              options: question.options.filter((_, i) => i !== optionIndex),
              correctIndex: question.correctIndex === optionIndex ? 0 : question.correctIndex - Number(optionIndex < question.correctIndex),
            })}>Remove</button>}
          </div>)}
          <button type="button" className="text-button" disabled={question.options.length >= MAX_OPTIONS} onClick={() => updateQuestion(question.id, { options: [...question.options, ''] })}>Add answer</button>
        </div>
        <label className="form-field">Correct answer
          <select value={question.correctIndex} onChange={event => updateQuestion(question.id, { correctIndex: Number(event.target.value) })}>
            {question.options.map((option, i) => <option key={i} value={i}>Answer {i + 1}{option.trim() ? ` · ${option.trim().slice(0, 70)}` : ''}</option>)}
          </select>
        </label>
        <label className="form-field">Explanation (optional)
          <textarea rows={2} value={question.explanation} maxLength={limits.explanation} onChange={event => updateQuestion(question.id, { explanation: event.target.value })} />
        </label>
        <button type="button" className="text-button" disabled={draft.questions.length === 1} onClick={() => setDraft({ ...draft, questions: draft.questions.filter(item => item.id !== question.id) })}>Remove question</button>
      </fieldset>)}
      {error && <p className="feature-error" role="alert">{error}</p>}
      <div className="deck-actions">
        <button type="button" className="secondary-button" disabled={draft.questions.length >= MAX_QUESTIONS} onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}>Add question</button>
        <button type="button" className="text-button" onClick={() => { setDraft(null); setError('') }}>Cancel</button>
        <button type="submit" className="primary-button">Save deck</button>
      </div>
    </form> : <>
      <div className="deck-actions">
        <button className="primary-button" disabled={importing} onClick={() => edit({ id: `deck-${crypto.randomUUID()}`, title: '', questions: [blankQuestion()] })}>Create deck</button>
        <button className="secondary-button" disabled={importing} onClick={() => fileInput.current?.click()}>{importing ? 'Importing…' : 'Import JSON'}</button>
        <input ref={fileInput} aria-label="Choose a Study Deck JSON file" type="file" accept=".json,application/json" hidden onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file && !importing) void importDeck(file)
        }} />
      </div>
      {message && <p className="small-copy deck-message" role="status">{message}</p>}
      {error && <p className="feature-error" role="alert">{error}</p>}
      <div className="deck-list">
        {decks.map(deck => <section className="panel deck-card" key={deck.id}>
          <div className="panel-heading"><h2>{deck.title}</h2><Icon name="layers" /></div>
          <p className="small-copy">{deck.questions.length} {deck.questions.length === 1 ? 'question' : 'questions'}</p>
          <div className="deck-actions">
            <button className="primary-button" disabled={sessionActive || importing} onClick={() => onPractice(deck.id)}>Practise</button>
            <button className="secondary-button" disabled={importing} onClick={() => edit(deck)}>Edit</button>
            <button className="secondary-button" onClick={() => downloadDeck(deck)}>Export JSON</button>
            <button className="text-button" disabled={importing} onClick={() => remove(deck)}>Delete</button>
          </div>
        </section>)}
      </div>
      <p className="page-footnote"><Icon name="shield" />Decks are saved in this browser. Export JSON to back up questions and answers or move them to another device.</p>
    </>}
  </>
}
