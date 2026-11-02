import { mockApi } from './mock/server'
import { engineApi, ready } from './service'

/**
 * The app talks to the C++ engine (WebAssembly, in a Web Worker) through engineApi.
 * If the engine cannot load (e.g. engine/build.sh has not produced heatwatch.wasm yet),
 * it falls back to the dev mock, and the UI labels every view "mock".
 * VITE_USE_MOCK=true forces the mock.
 */
type Api = typeof engineApi
let impl: Api | null = import.meta.env.VITE_USE_MOCK === 'true' ? (mockApi as unknown as Api) : null
export let USE_MOCK = impl !== null

const chosen: Promise<Api> = impl
  ? Promise.resolve(impl)
  : ready.then(
      () => (impl = engineApi),
      (e) => {
        console.warn('[HeatWatch] engine unavailable, using mock:', e)
        USE_MOCK = true
        return (impl = mockApi as unknown as Api)
      },
    )

export const api = new Proxy({} as Api, {
  get:
    (_, k: keyof Api) =>
    async (...args: unknown[]) =>
      ((await chosen)[k] as (...a: unknown[]) => unknown)(...args),
}) as Api
