import { useEffect, useRef, useState } from 'react'
import type { QuestionIllustration } from './model'
import Icon from './Icon'

const imageUrl = (src: string) => import.meta.env.BASE_URL + src

export default function QuestionIllustrations({ images }: { images: QuestionIllustration[] }) {
  const [selected, setSelected] = useState<QuestionIllustration | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (selected) dialog.current?.showModal()
    else dialog.current?.close()
  }, [selected])
  if (!images.length) return null
  return <>
    <div className="slide-illustrations">{images.map(item => <figure key={item.src} className="slide-illustration">
      <button type="button" className="illustration-button" onClick={() => setSelected(item)} aria-label={`Enlarge illustration: ${item.caption}`}>
        <img src={imageUrl(item.src)} alt={item.alt} loading="lazy" decoding="async" />
        <span>Enlarge<Icon name="search" /></span>
      </button>
      <figcaption>{item.caption}{item.credit && <small>{item.credit}</small>}</figcaption>
    </figure>)}</div>
    <dialog ref={dialog} className="illustration-dialog" aria-label="Enlarged illustration" onCancel={() => setSelected(null)} onClose={() => setSelected(null)}>
      {selected && <>
        <header><strong>{selected.caption}</strong><button type="button" className="icon-button" autoFocus aria-label="Close illustration" onClick={() => setSelected(null)}><Icon name="close" /></button></header>
        <img src={imageUrl(selected.src)} alt={selected.alt} />
        <footer>{selected.credit && <small>{selected.credit}</small>}<a href={imageUrl(selected.src)} target="_blank" rel="noreferrer">Open full size</a></footer>
      </>}
    </dialog>
  </>
}
