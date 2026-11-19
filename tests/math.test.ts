import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MathText from '../src/MathText.tsx'
import QuestionTable from '../src/QuestionTable.tsx'
import { renderMath, splitMath } from '../src/math.ts'
import { COURSES, QUESTIONS } from '../src/data.ts'

const markup = (value: string) => renderToStaticMarkup(createElement(MathText, { children: value }))

test('explicit inline and display math coexist with ordinary prose, currencies and escapes', () => {
  const source = String.raw`Price $20. Variable \(n\) and formula \[f(x)=\frac{1}{2}x^2\].`
  const parts = splitMath(source)
  assert.deepEqual(parts.filter(part => part.kind === 'math').map(part => [part.value, part.display]), [['n', false], [String.raw`f(x)=\frac{1}{2}x^2`, true]])
  assert.equal(parts.map(part => part.kind === 'math' ? part.raw : part.value).join(''), source)
  const literal = String.raw`An incomplete \(x and a literal \\(y\\) remain plain text.`
  assert.deepEqual(splitMath(literal), [{ kind: 'text', value: literal }])
})

test('math includes accessible MathML, italic variables and fraction/matrix layout', () => {
  const html = markup(String.raw`Calculate \(\alpha n+\lambda\frac{f(x)}{2}\) and \[\begin{bmatrix}1&2\\3&4\end{bmatrix}\].`)
  assert.match(html, /class="katex-mathml"/)
  assert.match(html, /class="katex-html" aria-hidden="true"/)
  assert.match(html, /<mi>α<\/mi>/)
  assert.match(html, /<mfrac>/)
  assert.match(html, /<mtable/)
  assert.match(html, /mathnormal/)
  assert.match(html, /class="math-block"/)
})

test('plain HTML is escaped, unsafe TeX cannot create links and invalid formulas stay readable', () => {
  const html = markup(String.raw`<img src=x onerror=alert(1)> \(\frac{1}\)`)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /&lt;img/)
  assert.match(html, /math-fallback/)
  const unsafe = markup(String.raw`\(\href{javascript:alert(1)}{x}\) \(\htmlClass{injected}{x}\)`)
  assert.doesNotMatch(unsafe, /<a\s|href="javascript:|class="injected"/)
  // Macro definitions must not leak between independent expressions.
  renderMath(String.raw`\gdef\privateSymbol{x}\privateSymbol`)
  assert.throws(() => renderMath(String.raw`\privateSymbol`))
})

test('table headers and values share the same math renderer', () => {
  const html = renderToStaticMarkup(createElement(QuestionTable, { table: { caption: 'Values', columns: [String.raw`\(n\)`, String.raw`\(f(n)\)`], rows: [['2', String.raw`\(\frac{1}{4}\)`]] } }))
  assert.match(html, /<mfrac>/)
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3)
})

test('all authored math in questions, answers, explanations and tables parses without errors', () => {
  for (const question of QUESTIONS) {
    const strings = [question.prompt, question.explanation, ...question.options.map(option => option.text), ...(question.table ? [question.table.caption, ...question.table.columns, ...question.table.rows.flat()] : [])]
    for (const text of strings) {
      for (const part of splitMath(text)) {
        if (part.kind === 'math') assert.doesNotThrow(() => renderMath(part.value, part.display), `${question.id}: ${part.value}`)
        else assert(!/\\[()[\]]/.test(part.value), `${question.id}: unbalanced math delimiter in ${part.value}`)
      }
    }
  }
})


test('math in both courses’ topic summaries renders without malformed delimiters', () => {
  for (const topic of COURSES.flatMap(course => course.topics)) {
    const summary = topic.summary
    if (!summary) continue
    const texts = [
      summary.overview,
      ...summary.concepts.flatMap(concept => [concept.title, concept.explanation]),
      summary.example.situation,
      ...summary.example.steps,
      ...summary.checks.flatMap(check => [check.question, check.answer]),
      summary.lowerPriority,
    ]
    for (const text of texts) {
      for (const part of splitMath(text)) {
        if (part.kind === 'math') assert.doesNotThrow(() => renderMath(part.value, part.display), `${topic.id}: ${part.value}`)
        else assert(!/\\[()[\]]/.test(part.value), `${topic.id}: unbalanced delimiter in ${part.value}`)
      }
    }
  }
})
