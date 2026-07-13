import { describe, expect, it } from 'vitest'
import { addItem, cartCount, cartTotal, removeItem, setQty } from './cart.js'

const burger = { id: 'lab-burger', name: 'The Lab Burger', price: 14.9 }
const fries = { id: 'lab-fries', name: 'Lab Fries', price: 3.5 }

describe('addItem', () => {
  it('adds a new line with qty 1', () => {
    const lines = addItem([], burger)
    expect(lines).toEqual([{ id: 'lab-burger', name: 'The Lab Burger', price: 14.9, qty: 1 }])
  })

  it('increments qty when the item is already in the cart', () => {
    const lines = addItem(addItem([], burger), burger)
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(2)
  })

  it('does not mutate the input array', () => {
    const before = addItem([], burger)
    const frozen = Object.freeze(before.map((l) => Object.freeze({ ...l })))
    const after = addItem(frozen, burger)
    expect(before[0].qty).toBe(1)
    expect(after[0].qty).toBe(2)
  })
})

describe('removeItem / setQty', () => {
  const two = addItem(addItem([], burger), fries)

  it('removes a line by id', () => {
    expect(removeItem(two, 'lab-burger')).toEqual([expect.objectContaining({ id: 'lab-fries' })])
  })

  it('sets an explicit qty', () => {
    const lines = setQty(two, 'lab-fries', 3)
    expect(lines.find((l) => l.id === 'lab-fries').qty).toBe(3)
  })

  it('drops the line when qty goes to 0 or below', () => {
    expect(setQty(two, 'lab-burger', 0).some((l) => l.id === 'lab-burger')).toBe(false)
    expect(setQty(two, 'lab-burger', -1).some((l) => l.id === 'lab-burger')).toBe(false)
  })
})

describe('cartCount / cartTotal', () => {
  it('counts total units and sums prices', () => {
    let lines = addItem([], burger)
    lines = addItem(lines, burger)
    lines = addItem(lines, fries)
    expect(cartCount(lines)).toBe(3)
    expect(cartTotal(lines)).toBeCloseTo(14.9 * 2 + 3.5, 2)
  })

  it('is 0 for an empty cart', () => {
    expect(cartCount([])).toBe(0)
    expect(cartTotal([])).toBe(0)
  })
})
