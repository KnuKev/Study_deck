import type { ReactNode, SVGProps } from 'react'

export type IconName = 'book' | 'play' | 'chart' | 'layers' | 'check' | 'close' | 'chevron' | 'arrow' | 'clock' | 'sun' | 'moon' | 'brain' | 'network' | 'flag' | 'refresh' | 'home' | 'shield' | 'info' | 'checkCircle' | 'target' | 'search'

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
  book: <><path d="M12 6C9 3 5 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-1-9 2Z" /><path d="M12 6v15" /></>,
  play: <path d="m8 4 12 8-12 8Z" />,
  chart: <><path d="M4 4v16h17M9 15v-4M14 15V7M19 15v-6" /></>,
  layers: <><path d="m12 3 10 5-10 5L2 8Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5a8.5 8.5 0 1 0 9.6 9.6Z" />,
  brain: <><path d="M12 5a3 3 0 0 0-5.6-1.4A4 4 0 0 0 3 10a4 4 0 0 0 1 7.3A4 4 0 0 0 12 19V5Zm0 0a3 3 0 0 1 5.6-1.4A4 4 0 0 1 21 10a4 4 0 0 1-1 7.3A4 4 0 0 1 12 19" /><path d="M6 8a3 3 0 0 0 3 3m-3 5a3 3 0 0 1 3-3m9-5a3 3 0 0 1-3 3m3 5a3 3 0 0 0-3-3" /></>,
  network: <><rect x="8" y="2" width="8" height="6" rx="1" /><rect x="2" y="16" width="7" height="6" rx="1" /><rect x="15" y="16" width="7" height="6" rx="1" /><path d="M12 8v4M5.5 16v-4h13v4" /></>,
  flag: <><path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-8h6v8" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
}

export default function Icon({ name, size = 18, className = '', ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props} aria-hidden="true" focusable="false">{paths[name]}</svg>
}
