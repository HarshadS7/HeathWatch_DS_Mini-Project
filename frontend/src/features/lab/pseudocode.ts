import type { StructureKey } from '../../lib/types'

/**
 * Pseudo-code listings. Line numbers are 1-based and are the contract with the
 * engine: every trace step carries `line`, and `event.op` selects the listing.
 */
export const PSEUDO: Partial<Record<StructureKey, Record<string, string[]>>> = {
  queue: {
    enqueue: [
      'enqueue(reading x):',
      '  if count == capacity:',
      '    reject x        // full: never overwrite',
      '    return FULL',
      '  slots[rear] ← x',
      '  rear ← (rear + 1) mod capacity',
      '  count ← count + 1',
      '  return OK',
    ],
    dequeue: [
      'dequeue():',
      '  if count == 0: return EMPTY',
      '  x ← slots[front]',
      '  slots[front] ← empty',
      '  front ← (front + 1) mod capacity',
      '  count ← count − 1',
      '  return x',
    ],
  },
}

export const COMPLEXITY: Partial<Record<StructureKey, { op: string; time: string; space?: string }[]>> = {
  queue: [
    { op: 'enqueue', time: 'O(1)' },
    { op: 'dequeue', time: 'O(1)' },
    { op: 'space', time: 'O(capacity)' },
  ],
}
