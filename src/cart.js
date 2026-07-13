/**
 * cart.js — pure, immutable order-cart logic (unit-tested in cart.test.js).
 *
 * Reference notes: React owns only `useState(lines)`; every mutation goes
 * through these pure functions inside functional updaters
 * (`setCart(c => addItem(c, item))`). Purity makes them idempotent under
 * React StrictMode's double-invoked updaters and trivially testable —
 * the UI cannot corrupt cart math and the math needs no UI to be verified.
 */

export function addItem(lines, item) {
  const existing = lines.find((l) => l.id === item.id)
  if (existing) {
    return lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
  }
  return [...lines, { id: item.id, name: item.name, price: item.price, qty: 1 }]
}

export function removeItem(lines, id) {
  return lines.filter((l) => l.id !== id)
}

export function setQty(lines, id, qty) {
  if (qty <= 0) return removeItem(lines, id)
  return lines.map((l) => (l.id === id ? { ...l, qty } : l))
}

export function cartCount(lines) {
  return lines.reduce((n, l) => n + l.qty, 0)
}

export function cartTotal(lines) {
  return lines.reduce((s, l) => s + l.price * l.qty, 0)
}
