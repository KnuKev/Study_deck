import { useId } from 'react'
import type { Question } from './model'

/** Original, small teaching diagrams that remain sharp at any screen size. */
export default function QuestionFigure({ kind }: { kind: NonNullable<Question['figure']> }) {
  const id = useId()
  if (kind === 'dense-network' || kind === 'mpls-network' || kind === 'campus-network') return <CourseFigure kind={kind} id={id} />
  const isNetwork = kind === 'network'
  const title = isNetwork ? 'A client connects to a server through a router.' : 'Training data is used to fit a model that makes predictions.'
  const labels = isNetwork ? ['Client', 'Router', 'Server'] : ['Training data', 'Model', 'Prediction']
  return <figure className="question-figure" style={{ margin: '24px 0', padding: '18px 12px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-muted)' }}>
    <svg viewBox="0 0 540 122" role="img" aria-labelledby={id} style={{ display: 'block', width: '100%', maxWidth: 540, margin: '0 auto', overflow: 'visible' }}>
      <title id={id}>{title}</title>
      {[0, 1].map(index => <g key={index} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${149 + index * 174} 46h48m-7-6 7 6-7 6`} />
      </g>)}
      {labels.map((label, index) => <g key={label} transform={`translate(${24 + index * 174} 12)`}>
        <rect width="114" height="68" rx="10" fill={index === 1 ? 'var(--accent-soft)' : 'var(--surface)'} stroke={index === 1 ? 'var(--accent)' : 'var(--border)'} />
        <g transform="translate(45 22)" fill="none" stroke={index === 1 ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {isNetwork ? index === 0 ? <><rect x="1" y="1" width="22" height="15" rx="2" /><path d="M12 16v5M7 21h10" /></> : index === 1 ? <><rect x="1" y="8" width="22" height="12" rx="3" /><path d="M5 8V2m14 6V2M5 14h1m4 0h1m4 0h4" /></> : <><rect x="2" y="1" width="20" height="9" rx="2" /><rect x="2" y="13" width="20" height="9" rx="2" /><path d="M6 5h.01M6 17h.01M12 5h6m-6 12h6" /></> : index === 0 ? <><rect x="2" y="1" width="20" height="22" rx="2" /><path d="M2 8h20M2 15h20M10 1v22" /></> : index === 1 ? <><circle cx="4" cy="4" r="3" /><circle cx="4" cy="20" r="3" /><circle cx="20" cy="12" r="3" /><path d="m7 5 10 6M7 19l10-6" /></> : <><path d="M2 2v20h21M6 16l5-5 5 2 6-8" /><path d="M17 5h5v5" /></>}
        </g>
        <text x="57" y="98" textAnchor="middle" fill="var(--text-secondary)" fontFamily="inherit" fontSize="12">{label}</text>
      </g>)}
    </svg>
  </figure>
}

function CourseFigure({ kind, id }: { kind: 'dense-network' | 'mpls-network' | 'campus-network'; id: string }) {
  const dense = kind === 'dense-network'
  const mpls = kind === 'mpls-network'
  const caption = dense ? 'Fully connected network with 2 inputs, 3 hidden neurons, and 1 output. Bias terms are omitted from the diagram.' : mpls ? 'Simplified MPLS network. CE nodes sit outside the service provider network.' : 'Simplified campus network with two gateway routers and a switched network with redundant links.'
  const nodes = dense
    ? [{ x: 90, y: 85, label: 'x₁' }, { x: 90, y: 175, label: 'x₂' }, { x: 280, y: 55, label: 'h₁' }, { x: 280, y: 130, label: 'h₂' }, { x: 280, y: 205, label: 'h₃' }, { x: 470, y: 130, label: 'y' }]
    : mpls ? ['CE', 'PE', 'P', 'P', 'PE', 'CE'].map((label, i) => ({ x: 40 + i * 96, y: 95, label }))
    : [{ x: 165, y: 60, label: 'GW 1' }, { x: 395, y: 60, label: 'GW 2' }, { x: 165, y: 155, label: 'D 1' }, { x: 395, y: 155, label: 'D 2' }, { x: 165, y: 245, label: 'A 1' }, { x: 395, y: 245, label: 'A 2' }]
  const edges = dense ? [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]] : mpls ? [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] : [[0, 2], [1, 3], [2, 3], [2, 4], [2, 5], [3, 4], [3, 5]]
  return <figure className="question-figure course-figure">
    <svg viewBox={`0 0 560 ${dense ? 255 : mpls ? 160 : 300}`} role="img" aria-labelledby={`${id}-title ${id}-caption`}>
      <title id={`${id}-title`}>{dense ? '2–3–1 neural network architecture' : mpls ? 'Simplified MPLS network' : 'Campus network with redundant links'}</title>
      {mpls && <><rect x="93" y="30" width="374" height="104" rx="14" fill="var(--accent-soft)" stroke="var(--border)" /><text x="280" y="52" textAnchor="middle" fill="var(--text-secondary)" fontSize="13">Provider network</text></>}
      {edges.map(([a, b]) => <line key={`${a}-${b}`} x1={nodes[a!]!.x} y1={nodes[a!]!.y} x2={nodes[b!]!.x} y2={nodes[b!]!.y} stroke="var(--accent)" strokeWidth="2" opacity="0.65" />)}
      {!dense && !mpls && <><line x1="195" y1="60" x2="365" y2="60" stroke="var(--text-secondary)" strokeDasharray="5 5" /><text x="280" y="42" textAnchor="middle" fill="var(--text-secondary)" fontSize="13">HSRP</text><text x="280" y="281" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">Switched network · Spanning Tree</text></>}
      {nodes.map((node, i) => <g key={i}>
        {dense ? <circle cx={node.x} cy={node.y} r="25" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" /> : <rect x={node.x - 29} y={node.y - 22} width="58" height="44" rx="9" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />}
        <text x={node.x} y={node.y} dy=".35em" textAnchor="middle" fill="var(--text)" fontSize="14" fontFamily="inherit" className={dense ? 'math-node-label' : undefined}>{dense && node.label.length > 1 ? <>{node.label[0]}<tspan baselineShift="sub" fontSize="11" fontStyle="normal" fontFamily="KaTeX_Main, serif">{node.label.endsWith('₁') ? '1' : node.label.endsWith('₂') ? '2' : '3'}</tspan></> : node.label}</text>
      </g>)}
    </svg>
    <figcaption id={`${id}-caption`}>{caption}</figcaption>
  </figure>
}
