# React 3D Rendering Stack for HeatWatch (React 19 + TS + Vite + Tailwind v4), as of November 2026

Research date: 2026-11-02. Package versions were pulled live from the npm registry (`https://registry.npmjs.org/<pkg>`) on that date. Bundle sizes come from the Bundlephobia API on the same date. Anything taken from training knowledge without re-checking is labeled "(unverified)".

---

## 1. Current versions, React 19 compatibility, and maintained vs deprecated packages

### Takeaway
The current stack is **three 0.187.0 + @react-three/fiber 9.8.2 + @react-three/drei 10.7.9**. It supports React 19.3 (latest is 19.3.1) and installs cleanly with Vite 8 and Tailwind 4. **framer-motion-3d is deprecated** and has no React 19 support. For animation, use `@react-spring/three` 10.x (React 19-ready) or GSAP 3.15 driving refs. Treat `@react-three/a11y`, `@theatre/r3f`, and `@react-three/offscreen` as stale or incompatible. Avoid R3F v10: it is still alpha and switches to WebGPU by default.

### Cited Findings

**Version table (npm registry, 2026-11-02)**

| Package | Latest | Published | Peer deps (key) | Status |
|---|---|---|---|---|
| three | 0.187.0 | 2026-10-30 | none | Active (monthly releases) — [npm](https://www.npmjs.com/package/three) |
| @types/three | 0.187.0 | 2026-10-30 | — | Active, matches three — [npm](https://www.npmjs.com/package/@types/three) |
| @react-three/fiber | 9.8.2 | 2026-10-14 | `react >=19 <19.4`, `react-dom >=19 <19.4`, `three >=0.156` | Active. Pre-release tags: `10.0.0-alpha.6`, `10.0.0-canary` — [npm](https://www.npmjs.com/package/@react-three/fiber) |
| @react-three/drei | 10.7.9 | 2026-09-25 | `react ^19`, `@react-three/fiber ^9.0.0`, `three >=0.159` | Active. `11.0.0-alpha.7` exists (for fiber v10) — [npm](https://www.npmjs.com/package/@react-three/drei) |
| @react-three/postprocessing | 3.2.2 | 2026-10-21 | `@react-three/fiber >=9.7.0`, `react ^19`, `postprocessing ^6.36.0` | Active — [npm](https://www.npmjs.com/package/@react-three/postprocessing) |
| postprocessing | 6.39.6 | 2026-11-01 | `three >=0.168.0 <0.188.0` | Active. Its upper bound on three matters (see Inferences) — [npm](https://www.npmjs.com/package/postprocessing) |
| @react-spring/three | 10.1.2 | 2026-06-24 | `react ^16.8 … ^19`, `@react-three/fiber >=6.0`, `three >=0.126` | Active. `11.0.0-beta.1` (2026-10-01) — [npm](https://www.npmjs.com/package/@react-spring/three) |
| motion / framer-motion | 14.9.0 | 2026-10-30 | `react ^18 \|\| ^19` | Active, but DOM-only (no three.js elements) — [npm](https://www.npmjs.com/package/motion) |
| framer-motion-3d | 12.4.13 | 2025-03-11 | `@react-three/fiber 8.2.2` (pinned) | **DEPRECATED** on npm: "Package no longer supported." — [npm](https://www.npmjs.com/package/framer-motion-3d) |
| leva | 0.10.1 | 2025-10-31 | `react ^18 \|\| ^19` | Maintained, slow cadence. A dev GUI only — [npm](https://www.npmjs.com/package/leva) |
| @react-three/a11y | 3.0.0 | **2022-05-15** | `@react-three/fiber >=8.0`, `react >=18` | **Stale.** No release in more than 4 years. The peer range doesn't exclude v9, but it is untested — [npm](https://www.npmjs.com/package/@react-three/a11y) |
| maath | 0.10.8 | 2024-07-07 | `three >=0.134` | Stable. A `1.0.0-canary` was published 2026-08-17. Drei depends on `maath ^0.10.8` — [npm](https://www.npmjs.com/package/maath) |
| @use-gesture/react | 10.3.1 | 2024-03-21 | `react >=16.8` | Stable but dormant. Drei depends on it — [npm](https://www.npmjs.com/package/@use-gesture/react) |
| gsap | 3.15.0 | 2026-04-13 | none | Active. License field: "Standard 'no charge' license: https://gsap.com/standard-license" — [npm](https://www.npmjs.com/package/gsap) |
| @gsap/react | 2.1.2 | 2025-01-15 | `gsap ^3.12.5`, `react >=17` | Stable (`useGSAP` hook) — [npm](https://www.npmjs.com/package/@gsap/react) |
| troika-three-text | 0.52.5 | 2026-07-24 | `three >=0.125` | Active. It powers drei `<Text>` — [npm](https://www.npmjs.com/package/troika-three-text) |
| camera-controls | 3.1.2 | 2025-11-17 | `three >=0.126.1` | Active. It powers drei `<CameraControls>` — [npm](https://www.npmjs.com/package/camera-controls) |
| three-stdlib | 2.36.1 | 2025-11-10 | `three >=0.128` | Maintained — [npm](https://www.npmjs.com/package/three-stdlib) |
| r3f-perf | 7.2.3 | 2024-11-08 | `@react-three/fiber >=8.0` | Dormant. A dev-only perf overlay — [npm](https://www.npmjs.com/package/r3f-perf) |
| @react-three/offscreen | 0.0.8 | 2023-05-11 | `@react-three/fiber >=8.0.0` | Stale — [npm](https://www.npmjs.com/package/@react-three/offscreen) |
| @theatre/r3f | 0.7.2 | 2024-05-19 | `@react-three/fiber ^8.13.6` | **Incompatible** with fiber v9 per its peer deps — [npm](https://www.npmjs.com/package/@theatre/r3f) |
| ogl | 1.0.11 | 2025-01-27 | none | Stable, low activity — [npm](https://www.npmjs.com/package/ogl) |
| @react-three/uikit | 1.0.78 | 2026-10-27 | `@react-three/fiber >=8` | Active (not needed here) — [npm](https://www.npmjs.com/package/@react-three/uikit) |

**Surrounding toolchain (npm, 2026-11-02):** react / react-dom 19.3.1 (2026-10-14); vite 8.3.5; @vitejs/plugin-react 6.1.2 (peer `vite ^8.0.0`); tailwindcss 4.3.3; lenis 1.3.27; recharts 3.10.1; lucide-react 1.66.0. All of these list React 19 in their peers — [npm react](https://www.npmjs.com/package/react), [npm vite](https://www.npmjs.com/package/vite).

**R3F release history and v10 status**
- R3F v9.8.0 (Sep 2026): "The headline feature is that R3F is now compatible with React 19.3.0." v9.8.2 (Oct 15, 2026) is a bug-fix release. It fixes portal memory leaks, updates the pixel ratio when a window moves between displays, and fixes TS JSX types. Its notes also warn that `setDpr` is overwritten by the `dpr` prop when Canvas re-renders — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- R3F v10.0.0-alpha.6 (Oct 17, 2026), titled "Going WebGPU First", makes WebGPURenderer the default. The GLSL/WebGL path moves to `@react-three/fiber/legacy`, and passing `gl={...}` to the default import throws. `state.gl` becomes `state.renderer`. TSL hooks move to `@react-three/tsl`, and "R3F's core no longer imports three.js at all." — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- The v9 migration guide calls v9 "a compatibility release for React 19". Breaking changes: `Props` is renamed `CanvasProps`; `MeshProps` and similar types are replaced by `ThreeElements['mesh']`; custom elements are declared via `declare module '@react-three/fiber' { interface ThreeElements {...} }` with `ThreeElement<typeof X>`; StrictMode is now inherited from react-dom; the `gl` factory receives constructor props and may be async; automatic sRGB conversion of texture props is removed — [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)

**react-spring**
- v10.0.0 shipped "feat!: react 19 support" (#2368). v10.1.1 shipped "fix(three): drive demand-mode frameloop so looping animations don't freeze" (#2536). v11.0.0-beta.1 (Oct 1, 2026) bumps deps to React ^19.3.0 and fiber ~9.8.0 — [react-spring releases](https://github.com/pmndrs/react-spring/releases)

**Motion's 3D support**
- `framer-motion-3d` is deprecated on npm — [npm](https://www.npmjs.com/package/framer-motion-3d)
- The Motion docs still host a "Motion for React Three Fiber" page. Per the search snippet, it pins `framer-motion-3d@11.2.0` with `@react-three/fiber@8.2.2` and says it is only compatible with React 18 — [motion.dev/docs/react-three-fiber](https://motion.dev/docs/react-three-fiber)
- A three.js forum post (Apr 3, 2025) says the package was discontinued without React 19 support and that "`motion/react` does not support three.js dom elements". The poster asks whether to just switch to `useFrame()`. The thread has no replies naming an official replacement — [three.js forum](https://discourse.threejs.org/t/r3f-and-animation-replace-motion-3d-and-declarative-approach/80663)

**Bundle sizes (Bundlephobia API, full-package numbers, not tree-shaken)**
- three 0.187.0: 742 KB min / **186 KB gzip**
- @react-three/fiber 9.8.2: 183 KB min / **58 KB gzip**
- @react-three/drei 10.7.9: 1.68 MB min / 521 KB gzip as a whole package. Real cost depends on which helpers are imported.
- @react-spring/three 10.1.2: 18 KB gzip. gsap 3.15.0: 27 KB gzip. maath 0.10.8: 10 KB gzip.
- Source: [bundlephobia.com](https://bundlephobia.com/package/three@0.187.0)
- drei 10.7.9's runtime dependencies include `three-stdlib`, `troika-three-text`, `camera-controls`, `meshline`, `maath`, `@use-gesture/react`, `detect-gpu`, `three-mesh-bvh`, `stats-gl`, `hls.js`, and `@mediapipe/tasks-vision`. Install is heavy even though tree-shaking removes most of it — [npm drei](https://www.npmjs.com/package/@react-three/drei)

### Inferences
- **Recommended pinned set:** `three@0.187.0`, `@types/three@0.187.0`, `@react-three/fiber@^9.8.2`, `@react-three/drei@^10.7.9`, plus one animation driver (`gsap@^3.15.0` with `@gsap/react@^2.1.2`, or `@react-spring/three@^10.1.2`). Add `maath` only if used directly; drei already pulls it in. Skip postprocessing for this project. Bloom and similar effects cost a lot on integrated GPUs and add nothing for DS visualizations.
- **Peer-range traps to watch:**
  - (a) R3F 9.8.2 caps React at `<19.4`. A future React 19.4 bump will raise peer warnings until R3F catches up, so pin React to 19.3.x.
  - (b) `postprocessing` 6.39.6 caps three at `<0.188`. If postprocessing is added, three cannot jump to 0.188 until postprocessing updates.
- **Do not adopt R3F v10 alpha or drei 11 alpha** for a university deadline. WebGPU is the default there, the APIs are still breaking, and the WebGL path is moved under `/legacy`. Stay on v9.
- Avoid `@theatre/r3f` (fiber v8 peer) and `framer-motion-3d` (deprecated, fiber 8.2.2 peer).
- `framer-motion` / `motion` can stay in the project for the DOM UI (controls, panels, page transitions), but it cannot animate meshes.
- `leva` is fine as a dev-only dependency for tuning colors and spacing. Exclude it from production or hide it with `<Leva hidden />` (unverified prop name; check the leva README).
- The bundle costs about 186 KB gzip for three plus about 58 KB for R3F, before drei helpers. Code-split the 3D showcase route so the rest of HeatWatch doesn't pay that cost (see section 3).

### Gaps
- I did not fetch the motion.dev R3F page directly; its content comes from a search snippet. Whether Motion plans a React 19 3D package is unknown.
- `@react-three/a11y` under fiber v9 / React 19 is untested. No source confirms it works or fails.
- Bundlephobia shows full-package sizes. I found no authoritative measurement of three's tree-shaken size for a typical R3F app.

---

## 2. Which drei helpers matter for this use, and their gotchas

### Takeaway
For seven small DS scenes, the core helpers are `View` (many scenes, one canvas), `Text` (labels and values), `Line` / `QuadraticBezierLine` (linked-list pointers, graph edges), `RoundedBox` (nodes, buckets, bars), `Instances` (sorting bars, hash slots), `Bounds` (auto-fit camera), `PerformanceMonitor` + `AdaptiveDpr` (integrated-GPU safety), and optionally `OrbitControls` / `CameraControls`. Skip `Environment` (HDR download), `ContactShadows` (extra render pass), `Text3D` (needs JSON font plus geometry cost), and `Float` (constant motion that conflicts with `frameloop="demand"` and with reduced motion).

### Cited Findings
- **View:** it uses "gl.scissor to cut the viewport into segments". Each `View` is tied to an HTML element and tracks its position and size. Setup is a single Canvas, ideally fixed or absolute and full-screen, with `<View.Port />` inside it and `eventSource={containerRef}` on the Canvas so DOM and 3D both receive events. You "can define as many views as you like". Props: `index` (render order), `frames` (set to `1` for views that never move, which avoids `getBoundingClientRect` cost), `visible`. `track` is deprecated in favor of inline views — [drei View docs](https://drei.docs.pmnd.rs/portals/view)
- **Text (troika):** "Text is suspense-based! Text will suspend while loading the font data, but in order to completely avoid FOUC you can pass the characters it needs to render" via the `characters` prop — [drei Text docs](https://drei.docs.pmnd.rs/abstractions/text)
- Troika supports ttf/otf/woff, but woff2 is reported as unsupported. `preloadFont({font, characters})` pre-generates SDF glyphs into an atlas shared by all Text instances — [troika README](https://cdn.jsdelivr.net/npm/troika-three-text@0.52.4/README.md); [three.js forum](https://discourse.threejs.org/t/how-to-preloadfont-in-troika-three-text/22500)
- A troika GitHub issue reports that text changed to include glyphs outside the initial set rendered truncated ("only 'hel' will be displayed"). This rests on a single older issue — [troika issue #69](https://www.github.com/protectwise/troika/issues/69)
- **Html:** `transform` places DOM in 3D with matrix3d. In that mode "the rendered html may appear blurry" on some devices. `occlude` hides it behind geometry, and `"blending"` mode "only correctly occludes rectangular HTML elements by default". `distanceFactor` scales with camera distance. The default `zIndexRange` is `[16777271, 0]` — [drei Html docs](https://drei.docs.pmnd.rs/misc/html)
- **PerformanceMonitor:** it averages FPS and calls `onIncline` / `onDecline` when FPS stays outside `bounds` (example `(refreshrate) => refreshrate > 90 ? [50, 90] : [50, 60]`). `onChange({factor})` gives a 0–1 factor. `flipflops` plus `onFallback` lock in a low-quality baseline and then shut the monitor down. Documented pattern: `<PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />`. The docs' gradual example `Math.floor(0.5 + 1.5 * factor, 1)` actually returns only integers, so use `0.5 + 1.5 * factor` unrounded — [drei PerformanceMonitor docs](https://drei.docs.pmnd.rs/performances/performance-monitor)
- R3F docs: Drei's controls call `invalidate()` automatically under `frameloop="demand"`. Drei's `<Detailed />` provides LOD — [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)

### Inferences
- **Per-scene helper map (from training knowledge of drei's API; component names exist in drei v10, but individual docs pages were not re-fetched):**
  - *Circular queue ring:* `RoundedBox` slots placed on a circle, `Text` indices, and a head/tail marker (a cone or `Html` badge).
  - *Linked list chain:* `RoundedBox` nodes, with `QuadraticBezierLine` or `Line` arrows for `next` pointers (add a small cone mesh as the arrowhead).
  - *BST:* sphere or rounded nodes, `Line` edges, and `Text` keys. Use `Bounds` to auto-fit as the tree grows.
  - *Hash table:* bucket array as `Instances` or `RoundedBox`, with chained entries stacked as small boxes.
  - *Graph BFS/DFS:* sphere nodes, `Line` edges, and color tweens for visited, frontier, and current. `Instances` only if the node count exceeds roughly 50.
  - *Sorting bars:* `Instances` (or a single `instancedMesh`) of boxes with per-instance color. This is the clearest instancing case.
  - *Stack:* vertical `RoundedBox` stack with push/pop tweens.
- **`Line` (meshline-based, fixed screen-space width)** is preferable to `THREE.Line`, because WebGL ignores `linewidth` > 1 on most platforms (unverified for 2026 drivers, but long-standing).
- **`Text` setup:** host one self-hosted `.woff` or `.ttf` font, for example Inter or JetBrains Mono, in `/public`. Pass `characters="0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]{}<>→nullheadtail "` and call `preloadFont` early. This prevents Suspense flashes when values change mid-animation.
- **Instances vs Merged:** `Instances` / `Instance` is the declarative instancing wrapper (one draw call; each `<Instance>` has its own position and color). `Merged` instances several distinct geometries at once. With 7 small scenes (tens of objects each), plain meshes with shared geometry and material are already within R3F's "a few hundred or less" guidance. Instancing is only clearly worth it for the sorting bars, and maybe the hash buckets.
- **`OrbitControls` vs `CameraControls`:** for an educational showcase, a fixed and framed camera plus `Bounds` is more accessible and predictable than free orbit. If orbit is offered, `CameraControls` (camera-controls 3.1.2) supports programmatic transitions such as "focus on node". Disable zoom-on-scroll so page scrolling and Lenis are not hijacked (inference; verify that the prop names `enableZoom` / `mouseButtons` still apply).
- **Skip or limit:**
  - `Environment` presets download HDR files from a remote CDN at runtime (unverified for drei 10.7.9). Use `ambientLight` + `directionalLight` or `<Lightformer>` instead.
  - `ContactShadows` renders an extra depth pass every frame it updates. If used, set `frames={1}` for static floors (unverified prop).
  - `Float` animates continuously and defeats `frameloop="demand"`.
  - `Text3D` needs typeface.json fonts and produces heavy geometry. Flat `Text` reads better for numbers.
- `Html` labels are fine for a few tooltips per scene. Dozens of `Html` elements across 7 views each create DOM nodes that are repositioned every frame, so use `Text` for in-scene labels and keep `Html` for a single hover tooltip.

### Gaps
- Gotchas for `View` combined with `Bounds` / `CameraControls` (each View needs its own camera and controls) were not verified against current docs.
- I didn't fetch the AdaptiveDpr / AdaptiveEvents docs page. From training knowledge (unverified): `<AdaptiveDpr pixelated />` lowers DPR when `performance.current` regresses, and `<AdaptiveEvents />` disables raycasting while regressed. Both depend on something calling `regress()`.

---

## 3. Performance: one Canvas + View vs multiple Canvases, demand frameloop, instancing, lazy loading, context limits

### Takeaway
Use **one shared `<Canvas frameloop="demand">` with seven drei `<View>`s**, or mount only the visible scene's Canvas. Do not mount seven independent Canvases. Each Canvas is its own WebGL context, and browsers cap active contexts at roughly 16 on desktop and fewer on mobile, evicting the oldest. Code-split the whole 3D module with `React.lazy`, and render on demand so idle scenes cost no GPU time.

### Cited Findings
- `frameloop="demand"` renders only when props change. Mutations React can't see need `invalidate()`, which "will not render immediately, it merely requests a new frame". "Each mesh is a draw call." Keep meshes to "a few hundred or less" (no more than 1000). Reuse geometries and materials. `regress()` alone changes nothing; the app must read `performance.current` — [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- Canvas props: `frameloop` = `always` (default) | `demand` | `never`. `dpr` defaults to `[1, 2]`. `fallback` is "optional DOM JSX elements or regular components in case GL is not supported". `eventSource` defaults to the canvas parent. `flat` disables ACES tone mapping, useful for true UI colors — [R3F Canvas API](https://r3f.docs.pmnd.rs/api/canvas)
- Chromium logs "WARNING: Too many active WebGL contexts. Oldest context will be lost." and evicts the oldest context — [Chromium source](https://chromium.googlesource.com/chromium/blink.git/+/6f93fedf18affab1f1f94df0ef138e284ddc43cd/Source/core/html/canvas/WebGLRenderingContext.cpp)
- The desktop Chrome limit is reported as 16 and Android Chrome (Pixel 2 XL) as 8. There is no reliable API to query the limit — [Plotly forum](https://community.plotly.com/t/too-many-active-webgl-contexts/16379); [StackOverflow mirror](https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/61277222/how-to-determine-number-of-active-webgl-contexts). These are forum-level sources, not official specs.
- A Chromium graphics developer said the team has no plans to raise the limit. The flag `--max-active-webgl-contexts` exists, and the advice is a single WebGL canvas, for example one full-page canvas with placeholder elements — [chromium graphics-dev](https://groups.google.com/a/chromium.org/g/graphics-dev/c/fmNedEEAYpA)
- drei `View` uses scissoring on one canvas, and `frames={1}` skips per-frame layout reads for static views — [drei View](https://drei.docs.pmnd.rs/portals/view)
- R3F v10 alpha.4 adds "multi-canvas renderer sharing", but only in an alpha, not in v9 — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)
- R3F 9.8.2 fixed portal memory leaks. drei `View` is portal-based, so stay on ≥9.8.2 — [R3F releases](https://github.com/pmndrs/react-three-fiber/releases)

### Inferences
- **Architecture options, ranked for this project:**
  1. **Best:** one fixed full-viewport `<Canvas frameloop="demand" dpr={[1, 1.5]} flat eventSource={pageRef}>` with `<View.Port />`. Each DS card in the showcase grid renders a `<View>` with its own scene, camera, and lights. There is one context and one renderer, and only views on screen draw (scissor). Set `frames={1}` only if the cards don't move. With Lenis scrolling, views move, so keep the default.
  2. **Simpler alternative:** a "focus mode" where the grid shows static SVG or poster thumbnails and one Canvas mounts only for the expanded scene. This also guarantees a single context and is easier to make accessible.
  3. **Avoid:** seven always-mounted Canvases. That makes seven contexts, seven render loops, and duplicated GPU resources. It works on desktop under 16 contexts, but combined with any other WebGL on the page (ogl backgrounds from the student's other work) it risks eviction, and it wastes memory on an integrated GPU.
- **Demand mode plus animation:** during step playback, either drive animation from `useFrame` and call `invalidate()` each tick while playing, or let GSAP's `onUpdate` call `invalidate()`. When paused, nothing renders. react-spring/three ≥10.1.1 drives demand mode itself (per its changelog).
- **Lazy loading:** wrap the whole 3D showcase in `const Showcase3D = lazy(() => import('./showcase3d'))` behind `<Suspense fallback={<SvgPoster/>}>`. Optionally lazy-load each scene module inside its View. Mount the Canvas only after an `IntersectionObserver` reports the section near the viewport. Vite 8 will put three, R3F, and drei in a separate chunk automatically when they are only imported from the lazy module.
- **Integrated-GPU budget:**
  - Set `dpr={[1, 1.5]}` rather than the default `[1, 2]` (a 2x DPR quadruples fragment work).
  - Use `antialias` by default, but drop it on `onFallback`.
  - Use `meshStandardMaterial` or cheaper `meshLambertMaterial` / `meshBasicMaterial`. Use no shadows, or one shadow-casting light at most.
  - Add `PerformanceMonitor` with `onDecline` → DPR 1 and `flipflops={3}` → `onFallback` → lock DPR at 1.
  - Share geometry and material instances across nodes. Mutate color through refs, not by creating new materials.
- Because R3F 9.8.2 notes that the `dpr` prop overwrites `setDpr` on re-render, keep DPR in React state and pass it as the prop, rather than calling `setDpr` imperatively.

### Gaps
- No primary benchmark compares View-on-one-canvas against multiple canvases on integrated GPUs. The recommendation rests on the documented context limit and on scissor rendering being cheaper.
- Firefox and Safari context limits were not found in authoritative sources.

---

## 4. Animation approach for discrete, scrubbable step playback (play / pause / step / seek)

### Takeaway
For JSON-trace playback with play, pause, step, and seek, the most robust approach is **deterministic: derive visual state from `(stepIndex, t∈[0,1])`**. Either use a **GSAP timeline with one label per trace step** that tweens refs (native `seek`, `tweenTo(label)`, `timeScale`, `reverse`), or use your own pure interpolation in `useFrame`. react-spring is good for "animate to the new step" transitions but has no native seekable timeline. maath `easing.damp` is good for smoothing toward a target but is not seekable.

### Cited Findings
- GSAP Timeline API: `pause(atTime)`, `play(from)`, `seek(position)` ("jumps to a time or label without changing paused or reversed state"), `progress(0..1)`, `addLabel(label, position)`, `tweenTo(label)` / `tweenFromTo(a, b)` (scrub the playhead linearly, then stop), `timeScale(n)` for speed control, `reverse()`, `eventCallback('onUpdate', fn)`, and `nextLabel()` / `previousLabel()` for step forward and back — [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline/)
- The gsap 3.15.0 npm license field reads "Standard 'no charge' license: https://gsap.com/standard-license", so it is free to use — [npm gsap](https://www.npmjs.com/package/gsap)
- The `@gsap/react` 2.1.2 `useGSAP` hook peers React ≥17 — [npm @gsap/react](https://www.npmjs.com/package/@gsap/react)
- A GSAP forum thread on scrubbed mesh animations found problems when GSAP code sat outside `gsap.context()`. The fix was a single timeline with mesh tweens aligned via the `"<"` position parameter — [GSAP forum](https://gsap.com/community/forums/topic/37264-scrub-animation-works-only-when-markers-set-to-true/)
- react-spring v10 supports React 19, and v10.1.1 fixed demand-frameloop looping animations in `@react-spring/three` — [react-spring releases](https://github.com/pmndrs/react-spring/releases)
- A three.js forum user without a framer-motion-3d replacement considered falling back to `useFrame()` — [three.js forum](https://discourse.threejs.org/t/r3f-and-animation-replace-motion-3d-and-declarative-approach/80663)

### Inferences
- **Recommended design (trace player):**
  1. Parse the JSON trace into `steps[]`, where each step is a full snapshot (positions, colors, labels, highlighted indices) or a diff that you fold into snapshots up front. Snapshots make seek O(1).
  2. Keep a small store with `{ stepIndex, playing, speed }`. Zustand is already a transitive dependency of R3F and drei, or use React state.
  3. **Option A (GSAP):** build one `gsap.timeline({ paused: true })` per scene inside `useGSAP`. For each step, `tl.addLabel('s'+i)` and add tweens on `meshRef.current.position` and `material.color` from snapshot i to i+1. Controls map directly: play → `tl.play()`, pause → `tl.pause()`, step → `tl.tweenTo(tl.nextLabel())`, back → `tl.tweenTo(tl.previousLabel())`, seek slider → `tl.progress(v)` or `tl.seek('s'+i)`, speed → `tl.timeScale(x)`. Add `onUpdate: invalidate` for demand mode. This also fits the student's existing GSAP experience.
  4. **Option B (no dependency):** in `useFrame`, compute `t` from a clock while playing, set `pos = lerp(snap[i].pos, snap[i+1].pos, ease(t))`, and call `invalidate()` while playing. Seek just sets `(i, t)`. This is fully deterministic and easy to test.
  5. Use react-spring/three only if you want physics-feeling "settle" transitions between discrete steps without scrubbing. Its springs are state-driven, and scrubbing backward through a spring is awkward.
  6. Use maath `easing.damp3(ref.current.position, target, 0.15, delta)` only for non-scrubbed polish, such as camera easing toward a focused node.
- GSAP structural changes (node insertion, edge creation) need the mesh to exist before tweening. Render the union of all nodes that ever appear, hidden via scale 0 or opacity 0, so timelines can target stable refs. This also keeps object identity stable for React.
- Reduced motion maps naturally: under `prefers-reduced-motion: reduce`, step changes call `tl.seek(label)` (an instant jump) instead of `tweenTo`, and autoplay is disabled.

### Gaps
- I found no official GSAP + R3F integration guide, and no 2025–2026 primary source showing `useGSAP` with R3F refs. The pattern is standard but undocumented by pmndrs or GSAP.
- No source benchmarks GSAP's ticker against R3F's `useFrame` loop for jank. Both run on rAF.

---

## 5. Accessibility and fallbacks: reduced motion, keyboard, screen-reader text, WebGL detection, 2D SVG fallback

### Takeaway
Treat the canvas as decoration over an **accessible DOM model**. Put playback controls in real `<button>`s with keyboard shortcuts. Provide an `aria-live` step narration generated from the trace and an SVG/HTML 2D view as both the no-WebGL fallback and a user-selectable "2D mode". Honor `prefers-reduced-motion` with instant step jumps and no autoplay or idle motion. `@react-three/a11y` is optional and stale.

### Cited Findings
- `prefers-reduced-motion` detects when the user has asked to "minimize the amount of non-essential motion". Values are `no-preference` and `reduce`. It is Baseline "Widely available… since January 2020". Detect it in JS with `matchMedia('(prefers-reduced-motion: reduce)')` and its `change` event — [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- R3F `<Canvas fallback={...}>` renders DOM JSX "in case GL is not supported" — [R3F Canvas API](https://r3f.docs.pmnd.rs/api/canvas)
- `@react-three/a11y` provides `<A11yAnnouncer />`, placed next to (not inside) the Canvas and "critical since it manage some screen-reader features". `<A11y role="content|button|togglebutton|link">` makes meshes focusable and keyboard-activatable, and `<A11yUserPreferences>` exposes prefers-reduced-motion and color scheme. The repo is not archived — [react-three-a11y GitHub](https://github.com/pmndrs/react-three-a11y). Its last npm release, 3.0.0, is from 2022-05-15 with peer `fiber >=8` — [npm](https://www.npmjs.com/package/@react-three/a11y)
- Losing a context, for example by exceeding the context limit, causes Chromium to drop the oldest context. The app must handle context loss — [Chromium source](https://chromium.googlesource.com/chromium/blink.git/+/6f93fedf18affab1f1f94df0ef138e284ddc43cd/Source/core/html/canvas/WebGLRenderingContext.cpp)

### Inferences
- **Reduced motion:** use a `useReducedMotion()` hook from `motion/react`, already a dependency (unverified that it is still exported in v14; otherwise write a 5-line matchMedia hook). When it is true:
  - Steps jump instantly (`tl.seek`).
  - No autoplay, no `Float` or idle rotation, camera transitions are instant.
  - Optionally default to the 2D view.
  - Keep a manual override toggle, because some users want motion anyway.
- **Keyboard:** the player bar uses native buttons (Prev, Play/Pause, Next, Reset), a range input for seek with `aria-valuetext="Step 4 of 12: enqueue 7"`, and shortcuts (Space = play/pause, ←/→ = step, Home/End). Scope the shortcuts to the focused scene card so they don't conflict with Lenis or page scroll.
- **Screen readers:**
  - Each scene card gets `role="region"` and `aria-label="Circular queue visualization"`.
  - The canvas element gets `aria-hidden="true"` (or `role="img"` with a summary).
  - A visually hidden `aria-live="polite"` paragraph announces each step's human-readable description from the trace (e.g., "Dequeue: removed 3 from index 2; head now 3").
  - A visually hidden `<ol>` or table mirrors the current data structure state.
  - This beats per-mesh `@react-three/a11y` focus stops for DS content and avoids a stale dependency.
- **WebGL detection:**
  - Before lazy-loading three, run `const ok = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();`. If it fails, never download the 3D chunk.
  - Also pass `fallback={<Svg2DScene/>}` to Canvas.
  - Listen for `webglcontextlost` on `gl.domElement` and swap to the 2D view.
  - Optionally use drei's bundled `detect-gpu` (via `useDetectGPU`, unverified API name) to default low-tier GPUs to 2D or DPR 1.
- **2D SVG fallback:** because playback is snapshot-driven (section 4), the same `steps[]` can render to an SVG component, optionally animated with motion/react, which the student already knows. The renderer becomes swappable (3D / 2D) behind one player. That is good architecture, makes the project testable, and lets an a11y-focused "2D mode" be a first-class feature.
- **Color:** encode state (visited, current, frontier, sorted) with shape, outline, or labels as well as color, for color-blind users. Use `flat` on Canvas so the Tailwind palette colors render as specified, without ACES tone shifts.

### Gaps
- I did not verify whether `@react-three/a11y` 3.0.0 works at runtime with fiber 9 / React 19.
- No authoritative source on WCAG guidance specific to WebGL canvases was fetched. The recommendations above follow general WAI-ARIA practice (unverified against a specific W3C page in this session).

---

## 6. Alternatives: Spline, CSS 3D transforms ("2.5D"), ogl, Threlte. When is CSS 3D good enough?

### Takeaway
**Threlte is out** (it is Svelte). **Spline embeds** suit a hero object, not data-driven, step-animated structures. **ogl** (1.0.11, last published Jan 2025) is tiny but has no React binding, text, or helpers. **CSS 3D transforms plus motion/react** are good enough, and arguably better, for array-like structures such as the stack, queue ring, sorting bars, and hash buckets. R3F earns its cost for the BST, linked-list curves, and the graph.

### Cited Findings
- ogl 1.0.11 was published 2025-01-27 with no peer deps — [npm ogl](https://www.npmjs.com/package/ogl)
- three 0.187 + R3F 9.8.2 costs about 186 KB + 58 KB gzip, against about 27 KB gzip for gsap or about 18 KB for react-spring/three — [bundlephobia](https://bundlephobia.com/package/three@0.187.0)
- Each WebGL canvas consumes a context from a limited pool (about 16 on desktop Chrome) — [Plotly forum](https://community.plotly.com/t/too-many-active-webgl-contexts/16379). CSS 3D transforms use no WebGL contexts (inference from the above).

### Inferences
- **CSS 3D is good enough when:**
  - The structure is a 1D or 2D grid of boxes (stack, queue, sorting bars, hash buckets).
  - You need fewer than about 100 elements.
  - Text must be crisp and selectable.
  - Accessibility must come for free, since the DOM is the visualization.
  - It avoids the 3D bundle entirely, and Tailwind v4 has `perspective-*`, `rotate-x-*`, `transform-3d` utilities (unverified exact utility names in 4.3).
  - motion/react's `layout` animations handle reordering, which suits sorting bar swaps and stack push/pop.
  - The circular queue can be a CSS ring (`rotateY(i * 360/n deg) translateZ(r)`).
- **CSS 3D breaks down for:**
  - Arbitrary edges between nodes (graph, BST, linked list). Lines between 3D-transformed DOM nodes are painful, though an SVG overlay works in 2.5D.
  - Depth sorting and intersection (CSS has no z-buffer across `preserve-3d` siblings in some browsers).
  - Lighting and shading.
  - More than a few hundred elements.
- **Pragmatic hybrid:** CSS 3D or motion for stack, queue, sorting bars, and hash table; R3F (one Canvas, Views) for BST, graph BFS/DFS, and the linked list. Alternatively, use R3F for all seven for visual consistency, since all seven fit easily in one canvas's budget. Choose by deadline and the visual-consistency goal.
- **Spline:** the runtime is a large dependency, scenes are authored in an external editor, and data-driven step updates fight its model. Not recommended (no 2026 source fetched).
- **ogl:** the student knows it from other projects, but it would mean hand-building text (SDF), lines, and controls. Not worth it for seven data-driven scenes.

### Gaps
- No primary sources were gathered on Spline's 2026 runtime size or React 19 package status, or on Tailwind v4's 3D transform utilities. Verify these before citing them.
- There is no benchmark of CSS 3D against WebGL on integrated GPUs for about 50–200 elements.

---

## 7. Notable 2025–2026 R3F showcases relevant to node/edge or bar visualizations

### Takeaway
I found no specific, verifiable 2025–2026 R3F showcase of data-structure or graph visualizations in this session. The report should point to the official pmndrs examples gallery and treat any specific showcase claims as unverified.

### Cited Findings
- R3F's docs host the official guidance pages used above (scaling performance, Canvas, v9 migration) — [r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/advanced/scaling-performance). drei's docs host the View, Html, Text, and PerformanceMonitor pages — [drei.docs.pmnd.rs](https://drei.docs.pmnd.rs/portals/view)

### Inferences
- Useful starting points to check manually (from training knowledge, unverified for 2026 availability):
  - The R3F examples page at `https://r3f.docs.pmnd.rs/getting-started/examples`, which includes drei "View" multi-scene demos and instancing demos.
  - pmndrs CodeSandbox examples for `Instances` (many boxes with per-instance color), `QuadraticBezierLine` (connected nodes with draggable endpoints), and `View` tracking.
  - Codrops (tympanus.net/codrops) R3F tutorials for staggered GSAP animations on instanced grids.
- For node and edge layout in the graph scene, compute positions in 2D with a force layout library or a fixed precomputed layout stored in the JSON trace, then lift them into 3D. Precomputed layouts keep step playback deterministic.

### Gaps
- No primary-source showcase list was verified (the tool budget was spent on version and compatibility data). The report writer should not cite specific 2025–2026 showcase projects from these notes.
