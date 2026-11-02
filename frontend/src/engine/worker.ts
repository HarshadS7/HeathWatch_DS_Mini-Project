/// <reference lib="webworker" />
// Hosts the C++ engine (compiled to WebAssembly). Same protocol as the native stdin/stdout build:
// request {id, op, payload, trace} -> response {id, ok, result, trace | error}.
type Handle = (req: string) => string

let handle: Handle | null = null

const ready = (async () => {
  const url = new URL('/engine/heatwatch.js', self.location.origin).href
  const factory = (await import(/* @vite-ignore */ url)).default
  const mod = await factory()
  // copy the request into heap memory (not the 64 KB stack, which large rebuild requests overflow)
  handle = (req: string) => {
    const n = mod.lengthBytesUTF8(req) + 1
    const ptr = mod._malloc(n)
    try {
      mod.stringToUTF8(req, ptr, n)
      return mod.UTF8ToString(mod._hw_handle(ptr))
    } finally {
      mod._free(ptr)
    }
  }
})()
ready.catch(() => {}) // reported per request below

self.onmessage = async (e: MessageEvent<string>) => {
  try {
    await ready
    self.postMessage(handle!(e.data))
  } catch (err) {
    const id = JSON.parse(e.data).id
    self.postMessage(JSON.stringify({ id, ok: false, error: `engine unavailable: ${(err as Error).message}` }))
  }
}
