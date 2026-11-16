import type { QuestionTable as Table } from './model.ts'
import MathText from './MathText.tsx'

export default function QuestionTable({ table }: { table: Table }) {
  return <div className="question-table-scroll" role="region" aria-label="Question table" tabIndex={0}><table className="question-table"><caption><MathText>{table.caption}</MathText></caption><thead><tr>{table.columns.map((column, i) => <th scope="col" key={i}><MathText>{column}</MathText></th>)}</tr></thead><tbody>{table.rows.map((row, i) => <tr key={i}>{row.map((value, j) => j === 0 ? <th scope="row" key={j}><MathText>{value}</MathText></th> : <td key={j}><MathText>{value}</MathText></td>)}</tr>)}</tbody></table></div>
}
