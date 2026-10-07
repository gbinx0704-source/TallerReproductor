export class DoublyLinkedListNode<T> {
  previous: DoublyLinkedListNode<T> | null = null
  next: DoublyLinkedListNode<T> | null = null
  value: T

  constructor(value: T) {
    this.value = value
  }
}

export class DoublyLinkedList<T> implements Iterable<T> {
  private head: DoublyLinkedListNode<T> | null = null
  private tail: DoublyLinkedListNode<T> | null = null
  private count = 0

  get length(): number {
    return this.count
  }

  get first(): T | null {
    return this.head?.value ?? null
  }

  get last(): T | null {
    return this.tail?.value ?? null
  }

  append(value: T): DoublyLinkedListNode<T> {
    const node = new DoublyLinkedListNode(value)
    if (this.tail) {
      node.previous = this.tail
      this.tail.next = node
    } else {
      this.head = node
    }
    this.tail = node
    this.count += 1
    return node
  }

  find(predicate: (value: T) => boolean): DoublyLinkedListNode<T> | null {
    let node = this.head
    while (node) {
      if (predicate(node.value)) return node
      node = node.next
    }
    return null
  }

  remove(node: DoublyLinkedListNode<T>): T {
    if (node.previous) node.previous.next = node.next
    else this.head = node.next
    if (node.next) node.next.previous = node.previous
    else this.tail = node.previous
    node.previous = null
    node.next = null
    this.count -= 1
    return node.value
  }

  next(node: DoublyLinkedListNode<T>, loop = false): DoublyLinkedListNode<T> | null {
    return node.next ?? (loop ? this.head : null)
  }

  previous(node: DoublyLinkedListNode<T>, loop = false): DoublyLinkedListNode<T> | null {
    return node.previous ?? (loop ? this.tail : null)
  }

  *[Symbol.iterator](): Iterator<T> {
    let node = this.head
    while (node) {
      yield node.value
      node = node.next
    }
  }
}