/**
 * videoMap.js — pure math for the scroll-scrubbed background film.
 *
 * Reference notes: everything here is DOM-free and unit-tested (see
 * videoMap.test.js). motion.js feeds it scroll anchors measured from the live
 * layout ([pin start → separation begins], [pin end → fully exploded],
 * [CTA enter → reassembly]) and it answers "what film timestamp belongs to
 * this scroll position". Keeping this pure is what made TDD catch a real
 * monotonicity bug (see sanitizeAnchors) before any user could.
 */

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

// Clamp a target seek time to what the network already buffered so scrubbing
// keeps responding on slow connections (frames only render inside buffered
// ranges; seeking past them freezes on the last decoded frame).
export function clampToBuffered(t, bufferedEnd) {
  if (!bufferedEnd || bufferedEnd <= 0) return null
  return Math.min(t, Math.max(0, bufferedEnd - 0.1))
}

// End of the buffered range that is contiguous with the start of the media.
// Using the LAST range's end is wrong with fragmented buffers ([0,2],[5,7]):
// a seek into the 2–5 gap has no decoded frames and freezes.
export function contiguousBufferedEnd(ranges) {
  for (const [start, end] of ranges || []) {
    if (start <= 0.1) return end
  }
  return 0
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
