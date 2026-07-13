// Pure scroll→video-time mapping used by motion.js. No DOM here — unit-testable.

// Keep only anchors whose scroll position strictly increases (>1px apart).
// Compares against the last KEPT anchor, not the raw predecessor — otherwise a
// value smaller than an already-kept one can slip through after a discard and
// the map stops being monotonic (video time would jump backwards on scroll).
export function sanitizeAnchors(raw) {
  const kept = []
  for (const p of raw) {
    if (!kept.length || p[0] > kept[kept.length - 1][0] + 1) kept.push(p)
  }
  return kept
}

// Piecewise-linear interpolation over [[scrollY, videoTime], ...] anchors.
export function mapTime(map, y) {
  if (!map || map.length < 2) return 0
  if (y <= map[0][0]) return map[0][1]
  for (let i = 1; i < map.length; i++) {
    if (y <= map[i][0]) {
      const [y0, t0] = map[i - 1]
      const [y1, t1] = map[i]
      return t0 + ((y - y0) / Math.max(1, y1 - y0)) * (t1 - t0)
    }
  }
  return map[map.length - 1][1]
}
