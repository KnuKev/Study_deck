import test from 'node:test'
import assert from 'node:assert/strict'
import { periodBounds } from '../src/resultsPeriod.ts'

test('recent and custom periods use local day boundaries and include the selected last day', () => {
  const now = new Date(2026, 10, 17, 14, 20)
  const recent = periodBounds('2', '', '', now)
  assert.equal(recent.start, new Date(2026, 10, 16).getTime())
  const custom = periodBounds('custom', '2026-11-15', '2026-11-16', now)
  assert.equal(custom.start, new Date(2026, 10, 15).getTime())
  assert.equal(custom.end, new Date(2026, 10, 17).getTime())
  assert(new Date(2026, 10, 16, 23, 59).getTime() < custom.end)
})
