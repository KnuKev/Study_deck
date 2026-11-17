import { useLayoutEffect, useRef } from 'react'

export function useSlidingIndicator<T extends HTMLElement>(
  selection: string | number | null,
  selector = '[aria-pressed="true"]',
) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const group = ref.current
    if (!group) return

    const measure = () => {
      const selected = group.querySelector(selector)
      if (!selected) {
        group.removeAttribute('data-indicator-ready')
        return
      }
      if (!group.offsetWidth) return

      const bounds = selected.getBoundingClientRect()
      const offset = bounds.left - group.getBoundingClientRect().left - group.clientLeft + group.scrollLeft
      group.style.setProperty('--indicator-x', `${offset}px`)
      group.style.setProperty('--indicator-width', `${bounds.width}px`)
      group.toggleAttribute('data-indicator-ready', true)
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(group)
    for (const button of group.children) observer.observe(button)
    return () => observer.disconnect()
  }, [selection, selector])

  return ref
}
