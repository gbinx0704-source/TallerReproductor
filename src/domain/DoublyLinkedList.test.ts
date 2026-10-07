import { describe, expect, it } from 'vitest'
import { DoublyLinkedList } from './DoublyLinkedList'

describe('DoublyLinkedList', () => {
  it('walks in both directions and preserves links after removing an item', () => {
    const list = new DoublyLinkedList<string>()
    const first = list.append('first')
    const middle = list.append('middle')
    const last = list.append('last')

    expect(list.next(last)).toBeNull()
    expect(list.previous(first)).toBeNull()
    expect(list.next(last, true)).toBe(first)
    expect(list.previous(first, true)).toBe(last)

    list.remove(middle)
    expect([...list]).toEqual(['first', 'last'])
    expect(list.next(first)).toBe(last)
    expect(list.previous(last)).toBe(first)
    expect(list.length).toBe(2)
  })
})