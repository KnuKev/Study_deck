export type Period = 'all' | '2' | '7' | '30' | 'custom'

function localDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year!, month! - 1, day!)
  date.setHours(0, 0, 0, 0)
  return date
}

export function periodBounds(period: Period, from: string, through: string, now = new Date()) {
  if (period === 'all') return { start: -Infinity, end: Infinity }
  if (period === 'custom') {
    const end = through ? localDate(through) : null
    if (end) end.setDate(end.getDate() + 1)
    return { start: from ? localDate(from).getTime() : -Infinity, end: end?.getTime() ?? Infinity }
  }
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - Number(period) + 1)
  return { start: start.getTime(), end: Infinity }
}
