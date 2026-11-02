// Tiny IndexedDB wrapper: durable observations, alerts and replay/settings state.
const DB = 'heatwatch'
const STORES = ['obs', 'alerts', 'meta'] as const
type Store = (typeof STORES)[number]

let dbp: Promise<IDBDatabase> | null = null
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('obs', { keyPath: 'id' })
      r.result.createObjectStore('alerts', { keyPath: 'id' })
      r.result.createObjectStore('meta')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return dbp
}

const wrap = <T,>(req: IDBRequest<T>) => new Promise<T>((res, rej) => ((req.onsuccess = () => res(req.result)), (req.onerror = () => rej(req.error))))

export async function getAll<T>(store: Store): Promise<T[]> {
  return wrap((await db()).transaction(store).objectStore(store).getAll()) as Promise<T[]>
}
export async function getMeta<T>(key: string): Promise<T | undefined> {
  return wrap((await db()).transaction('meta').objectStore('meta').get(key)) as Promise<T | undefined>
}
export async function putMany(store: Store, rows: unknown[], key?: string) {
  if (!rows.length) return
  const tx = (await db()).transaction(store, 'readwrite')
  const os = tx.objectStore(store)
  for (const r of rows) key ? os.put(r, key) : os.put(r)
  return new Promise<void>((res, rej) => ((tx.oncomplete = () => res()), (tx.onerror = () => rej(tx.error))))
}
export async function clearAll() {
  const tx = (await db()).transaction([...STORES], 'readwrite')
  STORES.forEach((s) => tx.objectStore(s).clear())
  return new Promise<void>((res) => (tx.oncomplete = () => res()))
}
