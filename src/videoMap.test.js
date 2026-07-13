import { describe, expect, it } from 'vitest'
import { mapTime, sanitizeAnchors } from './videoMap.js'

describe('sanitizeAnchors', () => {
  it('keeps strictly increasing anchors untouched', () => {
    const raw = [
      [0, 0],
      [1000, 1.1],
      [3600, 6.0],
      [6800, 6.6],
      [7500, 7.95],
    ]
    expect(sanitizeAnchors(raw)).toEqual(raw)
  })

  it('drops an out-of-order anchor (ctaEnter landing before pin end)', () => {
    const out = sanitizeAnchors([
      [0, 0],
      [1000, 1.1],
      [3600, 6.0],
      [3000, 6.6],
      [7500, 7.95],
    ])
    expect(out).toEqual([
      [0, 0],
      [1000, 1.1],
      [3600, 6.0],
      [7500, 7.95],
    ])
  })

  it('stays strictly monotonic even when out-of-order anchors cascade', () => {
    // Adversarial finding A8: filtering against the RAW predecessor lets an
    // anchor smaller than the last KEPT one slip through → video time would
    // jump backwards while scrolling down.
    const out = sanitizeAnchors([
      [0, 0],
      [300, 1],
      [100, 2],
      [200, 3],
    ])
    for (let i = 1; i < out.length; i++) {
      expect(out[i][0]).toBeGreaterThan(out[i - 1][0])
    }
  })
})

describe('mapTime', () => {
  const map = [
    [0, 0],
    [100, 2],
    [300, 6],
  ]

  it('interpolates linearly inside a segment', () => {
    expect(mapTime(map, 50)).toBeCloseTo(1)
    expect(mapTime(map, 200)).toBeCloseTo(4)
  })

  it('hits anchors exactly', () => {
    expect(mapTime(map, 0)).toBe(0)
    expect(mapTime(map, 100)).toBeCloseTo(2)
    expect(mapTime(map, 300)).toBeCloseTo(6)
  })

  it('clamps below the first and above the last anchor', () => {
    expect(mapTime(map, -50)).toBe(0)
    expect(mapTime(map, 9999)).toBe(6)
  })

  it('returns 0 for degenerate maps', () => {
    expect(mapTime(null, 100)).toBe(0)
    expect(mapTime([[0, 0]], 100)).toBe(0)
  })

  it('never goes backwards as scroll increases (monotonic end-to-end)', () => {
    const anchors = sanitizeAnchors([
      [0, 0],
      [300, 1],
      [100, 2],
      [200, 3],
    ])
    let prev = -Infinity
    for (let y = 0; y <= 400; y += 10) {
      const t = mapTime(anchors, y)
      expect(t).toBeGreaterThanOrEqual(prev)
      prev = t
    }
  })
})
