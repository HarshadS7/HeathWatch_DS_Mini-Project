import type { StructureKey } from '../../lib/types'

/**
 * Pseudo-code listings. Line numbers are 1-based and are the contract with the
 * engine: every trace step carries `line`, and `event.op` selects the listing.
 */
const graph = [
  'for each hot vertex s not yet visited:',
  '  mark s visited; put s in frontier',
  '  while frontier not empty:',
  '    v ← take(frontier)   // queue → BFS, stack → DFS',
  '    for each neighbour w of v (hot only):',
  '      if w visited: skip',
  '      mark w visited; put w in frontier',
  '  component complete',
]

export const PSEUDO: Record<StructureKey, Record<string, string[]>> = {
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
  list: {
    append: [
      'append(x):',
      '  node ← new Node(x)',
      '  if head == null: head ← tail ← node',
      '  else: tail.next ← node; tail ← node',
      '  size ← size + 1',
      '  if size > limit:',
      '    old ← head; head ← head.next; delete old',
    ],
  },
  bst: {
    range: [
      'range(node, from, to):',
      '  visit node',
      '  if node.key > from: range(node.left)   else prune left',
      '',
      '  if from ≤ node.key ≤ to: output node',
      '  if node.key < to: range(node.right)    else prune right',
    ],
    search: [
      'search(node, key):',
      '  while node ≠ null:',
      '    if key == node.key: return node',
      '    if key < node.key: node ← node.left',
      '    else: node ← node.right',
      '  return NOT_FOUND',
    ],
  },
  hash: {
    lookup: [
      'lookup(key):',
      '  b ← h(key) mod capacity      // h = Σ c·31^i',
      '  node ← buckets[b]',
      '  while node.key ≠ key: node ← node.next',
      '  if node ≠ null: return node.value',
      '  return NOT_FOUND',
    ],
  },
  graph: { bfs: graph, dfs: graph },
  sort: {
    sort: [
      'mergeSort(a, lo, hi):',
      '  if lo ≥ hi: return',
      '  mid ← (lo + hi) / 2',
      '  mergeSort(a, lo, mid)',
      '  mergeSort(a, mid + 1, hi)',
      '  copy a[lo..hi] to aux',
      '  a[k] ← smaller of aux[i], aux[j]  (tie: left)',
      '  a[lo..hi] is sorted',
    ],
    search: [
      'binarySearch(a, target):',
      '  lo ← 0; hi ← n − 1',
      '  while lo ≤ hi: mid ← lo + (hi − lo) / 2',
      '    if a[mid] == target: return mid',
      '    if a[mid] < target: lo ← mid + 1',
      '    else: hi ← mid − 1',
      '  return NOT_FOUND',
    ],
  },
  stack: {
    postfix: [
      'for each token:',
      '  operand → append to output',
      '  "(" → push',
      '  ")" → pop to output until "("',
      '  operator → pop while top has ≥ precedence; push',
      'pop remaining operators to output',
    ],
    eval: ['for each postfix token:', '  operand → push its value', '  operator → b ← pop; a ← pop; push a op b', 'result ← pop'],
  },
}

export const COMPLEXITY: Record<StructureKey, string[]> = {
  queue: ['enqueue O(1)', 'dequeue O(1)', 'space O(capacity)'],
  list: ['append O(1)', 'remove oldest O(1)', 'search O(n)'],
  bst: ['search O(h)', 'range O(h + k)', 'h = O(n) if skewed'],
  hash: ['lookup O(1) expected', 'O(n) worst', 'resize at load > 0.75'],
  graph: ['BFS / DFS O(V + E)', 'adjacency list'],
  sort: ['merge sort O(n log n)', 'aux space O(n)', 'binary search O(log n)'],
  stack: ['push / pop O(1)', 'conversion O(n)', 'evaluation O(n)'],
}
