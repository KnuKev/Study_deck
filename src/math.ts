import katex from 'katex'

export type MathPart = { kind: 'text'; value: string } | { kind: 'math'; value: string; display: boolean; raw: string }

function escapedAt(text: string, index: number): boolean {
  let count = 0
  while (index > 0 && text[--index] === '\\') count++
  return count % 2 === 1
}

/** Only explicitly delimited expressions are math; currency and prose stay text. */
export function splitMath(text: string): MathPart[] {
  const parts: MathPart[] = []
  let start = 0
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== '\\' || escapedAt(text, i) || !['(', '['].includes(text[i + 1]!)) continue
    const display = text[i + 1] === '['
    const close = display ? '\\]' : '\\)'
    let end = text.indexOf(close, i + 2)
    while (end !== -1 && escapedAt(text, end)) end = text.indexOf(close, end + 2)
    if (end === -1) continue
    if (i > start) parts.push({ kind: 'text', value: text.slice(start, i) })
    parts.push({ kind: 'math', value: text.slice(i + 2, end), display, raw: text.slice(i, end + 2) })
    start = end + 2
    i = start - 1
  }
  if (start < text.length) parts.push({ kind: 'text', value: text.slice(start) })
  return parts
}

export function renderMath(tex: string, display = false): string {
  return katex.renderToString(tex, {
    displayMode: display,
    output: 'htmlAndMathml',
    throwOnError: true,
    strict: 'error',
    trust: false,
    maxSize: 20,
    maxExpand: 1000,
    // A fresh object prevents one expression's definitions changing another.
    macros: {},
  })
}
