import { Fragment, memo, useMemo } from 'react'
import { renderMath, splitMath } from './math.ts'

// Common symbols recur throughout the bank. Bound the cache for long sessions.
const cache = new Map<string, string | null>()
let overflowObserver: ResizeObserver | undefined
function updateMathFocus(element: HTMLElement) {
  if (element.scrollWidth > element.clientWidth + 1) element.tabIndex = 0
  else element.removeAttribute('tabindex')
}

// Only overflowing formulas enter the tab order. One observer serves all formulas.
function observeMathOverflow(element: HTMLSpanElement | null) {
  if (!element) return
  if (typeof ResizeObserver !== 'undefined') {
    overflowObserver ??= new ResizeObserver(entries => entries.forEach(entry => updateMathFocus(entry.target as HTMLElement)))
    overflowObserver.observe(element)
  }
  updateMathFocus(element)
  void document.fonts.ready.then(() => { if (element.isConnected) updateMathFocus(element) })
  return () => { overflowObserver?.unobserve(element) }
}

function cachedMath(tex: string, display: boolean): string | null {
  const key = `${display ? 'block' : 'inline'}:${tex}`
  if (cache.has(key)) return cache.get(key)!
  let html: string | null = null
  try { html = renderMath(tex, display) } catch { /* Keep malformed content readable. */ }
  if (cache.size >= 1024) cache.delete(cache.keys().next().value!)
  cache.set(key, html)
  return html
}

/** Plain text is escaped by React; only KaTeX's restricted output becomes HTML. */
export default memo(function MathText({ children }: { children: string }) {
  const parts = useMemo(() => splitMath(children).map(part => part.kind === 'math' ? { ...part, html: cachedMath(part.value, part.display) } : part), [children])
  return <>{parts.map((part, index) => part.kind === 'text' ? <Fragment key={index}>{part.value}</Fragment> : part.html === null ? <span key={index} className="math-fallback">{part.raw}</span> : <span key={index} ref={observeMathOverflow} className={part.display ? 'math-block' : 'math-inline'} data-tex={part.value} dangerouslySetInnerHTML={{ __html: part.html }} />)}</>
})
