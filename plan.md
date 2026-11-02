# HeatWatch — Build Plan

> Implementation plan for the project specified in `PROJECT.md`.
> PROJECT.md says **what** to build; this file says **exactly how, in what order, and what it will look like** — with extra weight on the frontend, since that is where evaluation focuses.

**Name:** HeatWatch (as in PROJECT.md). Alternatives if wanted: *HeatGrid* (IMD grid + station graph), *ThermoTrace* (engine traces drive every visual).

---

## 0. Decisions made in this plan (read first)

| # | Decision | Why |
|---|---|---|
| D1 | **Primary data = IMD daily gridded max temperature 2015–2025** (`Maxtemp_MaxT_*.GRD`, already in this folder). Stations = the 1°×1° grid cell nearest each of ~16 Indian cities. | Real, attributed, offline, 11 years × 365 days × 16 stations ≈ 64k readings. No API needed for the demo. |
| D2 | **Prediction target becomes next-day max temperature** (not next-hour). | IMD grid is daily. Faking hourly data would contradict PROJECT.md's honesty rules. Note this deviation in the report and viva. Hourly Open-Meteo import stays an optional extension. |
| D3 | **Humidity shown as "not available in IMD grid"** (empty state), not invented. Optional Open-Meteo import fills it later. | Spec forbids fabricated values. |
| D4 | **Map = offline SVG map of India** (d3-geo + bundled GeoJSON) as the default; Leaflet only as an optional "online tiles" toggle. | Zero network dependency during the viva; full styling control; graph edges drawn as SVG lines. |
| D5 | **New page: `/lab` — "Structure Lab"**, a full-screen 3D showcase of all 7 structures, driven by real engine traces. The small DS panel on the dashboard stays (2D, compact) as the spec requires. | Your requirement; also the strongest grading lever. |
| D6 | **3D stack = three.js + @react-three/fiber v9 + @react-three/drei** (React 19 compatible), animations via **GSAP timelines** (you already use GSAP) so playback can be scrubbed/stepped/reversed. | One timeline per trace → play / pause / step / seek for free. |
| D7 | **Visual identity = "calm instrument" light theme + dark mode**, teal primary, single-hue heat ramp borrowed from HeatAlert `theme.py`, glass pill nav from the demonetisation project, soft "clay" depth from mini-project only on hero cards. | Reuses your proven pieces; consistent with PROJECT.md visual direction. |

---

## 1. Data plan

### 1.1 Sources in this folder
| File | Content | Use |
|---|---|---|
| `Maxtemp_MaxT_2015…2025.GRD` | IMD Pune daily max temp, 31×31 floats/day, 7.5–37.5°N, 67.5–97.5°E, 99.9 = missing | Station readings (replay), history, graph, ML |
| `imd_all_india_1901_2025.csv` | Monthly All-India max/min/mean + 1991–2020 normals | Dashboard "climate context" strip (warming stripes, departure from normal) |
| `heatalert.db` | Old OOPL project DB (normals, grid_daily summaries) | Reference only; reuse `monthly_normals` for anomaly labels |

### 1.2 Stations (16)
Delhi, Jaipur, Jodhpur, Ahmedabad, Mumbai, Pune, Nagpur, Bhopal, Lucknow, Patna, Kolkata, Bhubaneswar, Hyderabad, Chennai, Bengaluru, Banda/Prayagraj.
Each = `{station_id, name, lat, lon, grid_lat, grid_lon, source_type: "imd_grid_cell"}`. Labelled as **grid cells near the city, not physical sensors.**

### 1.3 Pipeline
`data/prepare.py` → reads GRD (reuse logic from `HeatAlert_Control_Room/grid.py`) → `data/sample/observations.csv` (`station_id, observed_at (date, UTC), temperature_c, source`) + `data/attribution.md`.
Replay session = stream the CSV in date order through `POST /api/observations` at configurable speed (e.g. 1 simulated day per 400 ms).

### 1.4 Monitoring bands (IMD-based, clearly labelled "illustrative — not an official declaration")
IMD definition (mausam.imd.gov.in/pdfs/heatcolduser/Definition.pdf): heatwave needs max ≥ 40 °C in plains (≥ 37 °C coastal, ≥ 30 °C hills) **and** departure from normal 4.5–6.4 °C, **or** actual max ≥ 45 °C; severe = departure > 6.4 °C or actual max ≥ 47 °C; official declaration needs ≥ 2 stations on 2 consecutive days. Normals come from the grid's own 2015–2024 day-of-year mean per cell (documented as a short-baseline approximation).

| Band | Rule (simplified for demo) | Colour | Label/icon |
|---|---|---|---|
| Normal | below Watch | slate `#64748b` (not green — avoids red/green pairing) | "Normal" ● |
| Watch | ≥ 37 °C | yellow-amber `#f0b44a` | "Watch" ▲ |
| Heatwave-like | ≥ 40 °C and departure ≥ 4.5 °C, or ≥ 45 °C | orange `#d9682f` | "Heatwave-like" ▲▲ |
| Severe-like | departure > 6.4 °C or ≥ 47 °C | deep red `#ad4416` | "Severe-like" ⚠ |

Bands are encoded by **colour + icon + text + marker ring size** (never colour alone). Continuous temperatures use a separate perceptually-uniform ramp (ColorBrewer YlOrRd / matplotlib *inferno*); departures/stripes use a diverging blue–white–red ramp. Teal is UI chrome only.
Threshold for alerts/hot-region graph is user-configurable (default 40 °C).

---

## 2. Architecture — fully static, deployable on Vercel (decision D8)

```
Browser
 ├─ React app (main thread) ──postMessage(JSON)──► Web Worker
 │                                                  └─ engine.wasm  (C++17 engine compiled with Emscripten)
 ├─ service layer (TypeScript): replay producer/consumer, alerts, settings   ← replaces FastAPI
 ├─ IndexedDB: observations, alerts, settings (survives reload → index rebuild demo)  ← replaces SQLite
 └─ static assets: IMD sample data, model.json (coefficients + evaluation), geo
```
- Same C++ source builds **natively with g++** (tests, viva) and to **WASM with emcc** (app). The built `engine.js/.wasm` is committed to `frontend/public/engine/`, so Vercel only serves static files.
- Worker messages keep PROJECT.md's protocol: `{id, op, payload}` → `{id, ok, result, trace}`; one in-flight queue, timeouts, worker restart + index rebuild on failure.
- ML: trained offline in Python (`ml/train.py`), exported to `model.json`; inference is a dot product in TS.

### 2.1 Engine protocol (with traces)
Request: `{"id":"r42","op":"bst.range","payload":{"station":"DEL","from":"2024-05-01","to":"2024-05-31"},"trace":true}`
Response: `{"id":"r42","ok":true,"result":{...},"trace":{...}}`

### 2.2 Trace format (the contract the 3D lab depends on)
Model: **Python Tutor style — full state snapshot per step + a small semantic event** (not deltas/undo stacks like JSAV/USFCA). Seeking to step *k* = render `steps[k].state`, so step-back and scrubbing are trivial and bug-free. Traces are small (≤ 64 elements, ≤ ~500 steps), so snapshot size is a non-issue (Python Tutor ships 10–200 KB traces fine).
```json
{
  "request_id": "r42", "structure": "bst", "op": "range",
  "engine_time_ms": 0.08, "truncated": false,
  "steps": [
    { "event": {"type":"visit","node":"n17","outcome":"go_left"},
      "line": 3, "note": "Compare 2024-05-01 with 2024-05-12 → go left",
      "vars": {"cur":"n17","lo":"2024-05-01","hi":"2024-05-31"},
      "counters": {"comparisons": 1, "visited": 1},
      "state": { "root":"n12", "nodes":[{"id":"n12","key":"2024-05-03#881","l":"n9","r":"n17"}, "..."] } },
    { "event": {"type":"prune","node":"n9"}, "line": 5, "note": "Left subtree entirely before range — skipped", "...": "..." }
  ],
  "result": { "...": "..." }
}
```
Rules:
- Node/slot IDs are **stable and assigned by the engine**, so meshes keep identity across steps (no "jiggle").
- Every step has `event`, `line` (pseudo-code line), `note` (narration), `vars` (pointers like front/rear/cur/lo/mid/hi), cumulative `counters`, full `state`.
- Errors (overflow, underflow, key not found) are the **final step** of the trace, not a missing trace.
- Engine caps steps and sets `truncated: true` beyond the cap. **Frontend never invents steps.**

Event vocab per structure:
| Structure | Events |
|---|---|
| Circular queue | `enqueue{slot}`, `dequeue{slot}`, `reject_full`, `advance_rear`, `advance_front`, `wrap` |
| Linked list | `append{node}`, `link{from,to}`, `remove_head`, `move_head`, `traverse{node}` |
| BST | `visit`, `go_left`, `go_right`, `insert`, `delete_case{0/1/2}`, `successor`, `prune`, `emit` |
| Hash table | `hash{key,h,bucket}`, `probe_chain{node}`, `collision`, `found`/`miss`, `resize{old,new}`, `rehash{key}` |
| Graph | `enqueue/push{v}`, `visit{v}`, `explore_edge{u,v}`, `skip_visited`, `component_done{id,members}` |
| Merge sort / binary search | `split{l,r}`, `compare{i,j}`, `write{k,val}`, `merge_done{l,r}`, `bs_probe{lo,mid,hi}`, `bs_found/miss` |
| Stack (formula) | `token`, `push_op`, `pop_op`, `output`, `push_val`, `apply{op,a,b}` |

---

## 3. Frontend plan (the graded part)

### 3.1 Stack
| Concern | Choice |
|---|---|
| Core | React 19.3, TypeScript, Vite 8, Tailwind CSS 4.3, React Router 7 |
| Server state / polling | TanStack Query (2–3 s polling on dashboard, as spec says) |
| Client state | Zustand (selected station, selected time, threshold, playback state) |
| UI primitives | shadcn/ui (Radix) — **Sidebar** (icon rail on desktop, Sheet on mobile), Dialog, Tabs, Slider, Tooltip, Select. Copy MIT Tremor *blocks* (Tracker, BarList, KPI cards) as source — **not** the `@tremor/react` package (still React 18 only) |
| Icons | lucide-react |
| Charts | Recharts 3.10 via shadcn `Chart` (CSS-variable colours, `accessibilityLayer`); custom SVG + d3-scale for warming stripes + calendar heatmap |
| Map | d3-geo 3.1 + topojson-client 3.1 + bundled India TopoJSON (Survey-of-India-consistent boundary, e.g. DataMeet-derived), custom SVG layer for markers, edges, component hulls. Stretch: MapLibre + PMTiles (needs bundled glyphs/sprites) |
| Motion (2D) | `motion` 14 for layout/enter transitions; `@number-flow/react` for animated KPI numbers; GSAP for playback timelines |
| 3D | three 0.187 + @types/three 0.187, @react-three/fiber **9.8.2**, @react-three/drei **10.7.9**, gsap 3.15 + @gsap/react 2.1, optional @react-three/postprocessing 3.2 (subtle bloom on active nodes only). **Pin React to 19.3.x** (R3F peer range `>=19 <19.4`). **Do not use** R3F v10 / drei 11 (alpha, WebGPU-default), framer-motion-3d (deprecated), @react-three/a11y, @theatre/r3f (fiber-8 only) |
| Fonts | Inter (UI), Fraunces (display numbers/headings), JetBrains Mono (keys, pseudo-code) — self-hosted via `@fontsource` for offline |

### 3.2 Design system (`src/styles/tokens.css`)
- **Surfaces:** page `#f4f3ef`, card `#fcfcfb`, border `#e1e0d9` (from HeatAlert); dark: `#0f1214` / `#171b1e`.
- **Primary:** deep teal `#0f766e` (hover `#115e59`, wash `#ccfbf1`).
- **Heat ramp:** single-hue orange-red from `theme.py` (`TEMP_RAMP`) for map fills + bands; never used for UI chrome.
- **Depth:** flat bordered cards for data; soft clay shadow only on KPI tiles and the Lab's floating control dock.
- **Nav:** compact left sidebar on ≥1024px (icon + label, collapsible to icons); glass pill top-bar with burger on mobile (port `PillNav.tsx` from demonetisation project).
- **Motion rules:** 150–250 ms ease-out for state changes; number tickers on KPI change; no idle looping animation on data pages; all disabled under `prefers-reduced-motion`.
- **States:** shared `<Skeleton>`, `<EmptyState>`, `<StaleBadge>` ("Last update 14 min ago"), `<ErrorState retry>` components used by every data card.
- **Units always shown:** `°C`, `km`, `%`, `ms`.

### 3.3 Pages & routes
| Route | Page | Key components |
|---|---|---|
| `/` | **Dashboard** | Copernicus Climate-Pulse pattern: one dominant map + a headline sentence stating variable, threshold, source, date. Header (region, data mode chip "Offline replay · IMD grid", freshness badge that turns "Stale"/"Offline · cached", replay ▶ ❚❚ ⟲ + speed), 4 KPI tiles (value + delta + sparkline + band chip: stations, hottest reading, above-threshold count, queue utilisation ring), India SVG map (band markers + hot-component hulls) with docked legend, ranked station list, linked hover across map/list/chart, station trend chart, alerts feed, **collapsible DS panel** (2D mini views of queue/list/hash for the current op). Signature visuals: per-station warming stripes; "this year vs grey band of past years" chart |
| `/stations/:id` | **Station detail** | Identity card + coordinates + source, latest reading & freshness, history chart with range selector, next-day prediction card (value, target date, model version, "unavailable" state), recent-list (linked list rendered as chips with arrows), alert history |
| `/history` | **Historical explorer** | Filters (station, date range), paginated table, "Sort with merge sort" button → sorted table + comparison count, "Binary search" input → interval-narrowing strip, "Show BST path" → mini tree. Distinguishes *DB load time* vs *engine algorithm time* |
| `/alerts` | **Alerts & hot regions** | Threshold slider, active/resolved alerts with acknowledge, graph view of stations (map overlay) with BFS/DFS toggle, traversal order list, component legend. Disclaimer: "connectivity, not heat propagation" |
| `/lab` | **Structure Lab (3D showcase)** | See §4 |
| `/model` | **Model report** | MAE model vs persistence baseline, per-station table, test period, honest "baseline wins" if it does |
| `/about` | **About / viva sheet** | Architecture diagram, experiment mapping table, data attribution |

Selection sync: one Zustand store `{stationId, asOf, mode}` → map, cards, charts, alerts all read from it.

---

## 4. Structure Lab — the 3D showcase page (`/lab`)

### 4.1 Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│  Structure Lab                 [Queue][List][BST][Hash][Graph][Sort][Stack] │  ← tab rail (keyboard 1–7)
├───────────────────────────────────────────────┬─────────────────────┤
│                                               │  OPERATION           │
│            3D CANVAS (R3F)                    │  [enqueue DEL 43.1°C]│
│   orbit-able, auto-framed, soft shadows       │  [Run on engine ▶]   │
│                                               │──────────────────────│
│   floating labels (drei <Text>/<Html>)        │  PSEUDO-CODE         │
│                                               │  1 if count==cap ... │  ← current line highlighted
│                                               │──────────────────────│
│                                               │  STATE / COUNTERS    │
│                                               │  front 3  rear 7     │
│                                               │  count 4/8  O(1)     │
├───────────────────────────────────────────────┴─────────────────────┤
│ ⏮ ◀ ▶/❚❚ ▶ ⏭   speed 0.5×–4×   ━━━━●━━━━━━━━ step 6/14            │  ← scrubber w/ event markers
│ "Compare 2024-05-01 with 2024-05-12 → go left"                       │  ← narration (aria-live)
└─────────────────────────────────────────────────────────────────────┘
```
- **One** `<Canvas frameloop="demand" flat dpr={[1,1.5]} eventSource={pageRef}>` for the whole page; each structure is a drei `<View>` (browsers cap WebGL contexts at ~16 and drop the oldest — never one Canvas per scene). The 3D chunk is `React.lazy`-loaded only after a WebGL check passes.
- "Run on engine" calls `POST /api/engine/demo/<structure>` → trace → **player store** (Zustand or `useReducer`): `{trace, step, playing, speed}`. Play = `setTimeout` advancing `step`; every panel (3D, pseudo-code, vars, counters, narration) is derived from `steps[step]`.
- In the 3D scene, meshes are keyed by node ID; a pure `layout(state) → target positions` function gives where each node should be, and `useFrame` eases toward targets with frame delta (maath `easing.damp3`) — no `setState` per frame (R3F pitfalls guidance), `invalidate()` while moving so `frameloop="demand"` still renders. Reduced motion → snap to target.
- Scrubber shows **colour-coded event markers** (collision, rotation-free prune, overflow…) with "jump to next event of this type".
- Deep link to a step (`/lab/bst?req=r42&step=6`) for the report and viva.
- **Raw trace inspector** drawer (collapsible JSON of the current step + request ID + engine time) — evidence in the viva that nothing is faked.
- "Use live data" toggle: operates on the actual running dashboard state (e.g. the real queue during replay) vs a small seeded demo instance.
- Badge on every scene: **"Trace from C++ engine · request r42 · 0.08 ms"** — proves it isn't a fake animation.
- Landing hero of `/lab`: slow-orbiting overview of all 7 mini-scenes on a grid "shelf"; click one to fly the camera in (drei `<CameraControls>`), respecting reduced motion (cut instead of fly).

### 4.1b Art direction — "cosy diorama" (reference: Bruno Simon, *My Room in 3D*, https://github.com/brunosimon/my-room-in-3d)
Not retro/low-poly game graphics. Every structure is a **tiny isometric diorama on a floating rounded island**, like a toy model of a weather station:
- **Camera:** orthographic, isometric-ish angle (~35° elevation, 45° azimuth), limited orbit (±25°), gentle zoom. Feels like looking into a dollhouse.
- **Shapes:** everything rounded and chunky-soft — `RoundedBox` with large radius, capsules, pill shapes, spheres; nothing sharp or flat-shaded.
- **Materials:** matte pastel (roughness ≈ 0.9, no metal), from a small palette: cream `#fbf6ee`, sand `#efe3cf`, sage `#b9d3c2`, teal `#5fb3a6`, sky `#a9cfe6`, peach `#f6c3a3`, coral `#ef8f6b`, deep heat `#d9573b`. Heat colours stay meaningful (readings), everything else is soft neutral.
- **Light:** warm key light + cool fill, soft **baked-looking shadows** (drei `AccumulativeShadows` + `RandomizedLight`, computed once then frozen → cheap), soft `Environment` with Lightformers for gentle sheen; AgX tone mapping; light background gradient (cream → pale sky). Dark mode = "night room": deep navy, warm lamp-lit glow on active nodes.
- **Props that tie to the theme:** a tiny weather mast / thermometer on each island, little sun, wind sock; reading "parcels" are small rounded crates tinted by temperature with a label tag.
- **Motion:** gentle, springy, toy-like (overshoot easing on drops, soft squash on landing), slow idle bob on the island only (off under reduced motion). Hover = slight lift + soft outline.
- **Text:** clean rounded labels on billboards (Inter/Fraunces), never extruded 3D text.
- Optional later: bake real lightmaps in Blender for the islands (Bruno's technique) and load as GLB — only if time permits; the procedural version must already look finished.

### 4.2 Scene designs (3D metaphor → what the trace animates)
| Structure | 3D representation | Animated by trace | Teaching overlay |
|---|---|---|---|
| **Circular queue** | A **ring of N rounded slot-blocks** lying flat (like a carousel). Filled slots rise and glow in heat colour of the reading; two floating pointer pins **FRONT** (teal) and **REAR** (amber) orbit the ring. | `enqueue` drops a reading-cube into the rear slot; pin advances; `wrap` makes the pin cross index 0 with a highlighted arc; `reject_full` = cube bounces off with red flash + "Rejected (full)" counter++ | count/capacity gauge, `rear = (rear+1) % cap` line highlighted |
| **Linked list** | **Floating capsules** in a gentle line, joined by 3D arrow tubes (`next`); HEAD/TAIL flags. | `append` new capsule slides in at tail, arrow draws; `remove_head` oldest capsule falls away and HEAD flag hops | length / history limit, O(1) badges on append & remove |
| **BST** | **Tree of spheres** with depth = y-axis and slight z-stagger to avoid overlap; key text on each node; edges as tubes. Skewed tree visibly leans into a "staircase". | `visit` pulses node + travelling light along edge; `prune` greys out whole subtree; `emit` lifts node into an output tray; deletion cases animate successor swap | height, comparisons, visited; "skew meter" (height vs ⌈log₂n⌉) |
| **Hash table** | **Row of bucket wells** (open boxes) on the floor; chained nodes **stack upward** as columns (collision = taller column). Height map literally shows distribution. | `hash` shows key → formula → arrow flying to bucket; `probe_chain` lights nodes up the column; `resize` animates all columns dissolving and re-dropping into the wider row | load factor gauge, longest chain, collisions |
| **Graph (hot regions)** | Stations as **pins on a 3D extruded India outline** (tilted map plate), edges as arcs; hot stations glow in band colour, others ghosted. | BFS: frontier ring expands, queue shown as a side strip; DFS: stack shown as a tower; `component_done` paints a translucent hull around the component | traversal order list, component count, BFS vs DFS toggle |
| **Merge sort / binary search** | **3D bar terrain** — each reading is a bar (height = °C, heat-ramp colour). Split = bars separate into floating groups; merge = bars slot back in order. Binary search: a glass **window** frames `[lo, hi]` and shrinks; `mid` bar flashes. | `split/compare/write/merge_done`, `bs_probe` | comparisons vs n·log₂n line, auxiliary array shown as ghost row |
| **Stack (formula)** | Two **vertical tubes** (operator stack, value stack) with tokens as discs (like a Tower-of-Hanoi peg); token tape scrolls across the top; output (postfix) tape below. | `push_op/pop_op/output/push_val/apply` | precedence table, current token, result |

### 4.3 Shared 3D building blocks (`src/features/lab/three/`)
`<NodeBlock>` (drei `RoundedBox`/sphere + `Text` label with preloaded `characters`), `<Arrow3D>` (`Line`/`QuadraticBezierLine` + cone), `<Pointer>` (floating pin with label), `<Tray>`, `<GlowPulse>`, `<SceneFrame>` (hemisphere + directional light, baked-looking soft shadow plane, auto-fit `<Bounds>`; skip `Environment`/`ContactShadows` for performance), `Instances` for sort bars and queue slots, `PerformanceMonitor` (+ DPR held in React state) for adaptive quality, `useTracePlayer()` (player store: `play/pause/step/seek/speed`) + `useEasedLayout(layout(state))` hook. GSAP stays for page-level 2D motion (nav, camera fly-in), not for trace playback. drei `Html` only for hover tooltips.
- **Fallback = same snapshots drawn as SVG** → doubles as a user-selectable "2D mode" toggle (and Canvas `fallback` prop when WebGL is missing).

### 4.4 Quality guardrails
- Labels always face camera (billboard) and stay ≥ 12 px; no text on rotating surfaces.
- Camera constrained (min/max polar angle, zoom limits) + "Reset view" button.
- `prefers-reduced-motion` → instant step transitions, no camera fly, no bloom.
- **No-WebGL fallback**: detect WebGL; render a 2D SVG version of the same frame (the 2D DS panel components are reused).
- Keyboard: `Space` play/pause, `←/→` step, `1–7` switch structure, `R` reset camera. Narration line is `aria-live="polite"`.
- Performance: `frameloop="demand"`, instanced meshes for bars/slots, `AdaptiveDpr`, cap at 64 visual elements per scene.

- 3D must be *justified* (Munzner: "no unjustified 3D"): depth is used only where it carries meaning — ring shape (queue), chain height (hash collisions), tree depth (BST), recursion level (merge sort), stack height. Comparisons (bar heights) use an **orthographic camera** preset to avoid perspective distortion. Counters/pseudo-code live in a 2D HTML overlay, never in 3D text.
- Preset camera views per scene (Front / Top / Isometric) + Reset.

### 4.5 Learning features (core, not optional — research says engagement > visuals)
Hundhausen et al. 2002 (meta-study of 24 experiments): *how* learners engage matters more than what they see. Naps et al. 2002 engagement levels: viewing → responding → changing → constructing → presenting. So the Lab must go beyond "viewing":
- **Changing:** user picks inputs (station, key, threshold, formula) — every run is a fresh engine call.
- **Responding:** **Predict-the-step quiz** — pauses before a decision step ("which bucket?", "left or right?", "which vertex next?") and checks against the engine trace (Byrne et al. 1999: prediction drives learning).
- **Presenting:** **Presenter mode** — big type, hides controls, step with arrow keys for the viva.
- Step-back + scrubber, synced pseudo-code, narration, counters (VisuAlgo pattern: Space play/pause, ←/→ step, −/+ speed, ±N-frame jumps).

### 4.6 Extra "wow" features (only after core works)
- **Compare mode** — split view: BST from chronological inserts vs balanced rebuild (same keys) side by side; or linear vs binary search counters.
- **Export PNG** of current frame for the report.

---

## 5. Backend & engine (condensed — full detail in PROJECT.md)

### 5.1 C++ engine (`engine/`)
Files: `circular_queue`, `linked_list`, `bst`, `hash_table`, `graph`, `sorting` (merge sort + binary search), `stack_expr` (extension), `protocol` (NDJSON, nlohmann/json single header), `trace` (TraceRecorder appending events). No STL containers for assessed structures. CMake + `engine/tests/` (doctest or plain asserts) covering every edge case in PROJECT.md §Verification.

### 5.2 FastAPI (`backend/app/`)
- `engine_client/` — one persistent subprocess, asyncio lock, request IDs, timeout, auto-restart + index rebuild.
- `services/replay.py` — producer with backpressure (retry when queue full), consumer loop.
- `services/alerts.py` — open / update / resolve / acknowledge state machine.
- All routes from PROJECT.md §API, plus `POST /api/engine/demo/{structure}` returning traces for the Lab and `GET /api/engine/state`.
- SQLite via `sqlite3` + small repository layer; UTC timestamps.

### 5.3 ML (`ml/`)
Features: t, t-1, t-2, t-3 day max, 7-day trailing mean, day-of-year sin/cos, station one-hot. Chronological split: train 2015–2022, val 2023, test 2024–2025. Linear regression → optional RandomForest/GBR. Baseline = persistence (tomorrow = today). Report MAE °C overall + per station → `ml/artifacts/evaluation.json`, shown on `/model`.

---

## 6. Build order (fastest path to a gradeable product)

| Step | Work | Done when |
|---|---|---|
| 1 | `data/prepare.py` → stations + observations CSV | CSV has 16 stations × ~4,000 days |
| 2 | Frontend scaffold: Vite + TS + Tailwind v4 + router + tokens + layout (sidebar, pill nav, theme toggle) + **mock API layer** (`src/lib/mock/`) | All pages render with mock data — design work can proceed in parallel with backend |
| 3 | C++ engine: queue, list, hash, BST, sort/search, graph + trace recorder + tests | `engine/tests` pass; NDJSON round-trip works |
| 4 | FastAPI + engine client + SQLite + replay | Replay streams into queue, dashboard polls real data |
| 5 | Dashboard, Station, History, Alerts pages wired to real API | Full offline journey works |
| 6 | **Structure Lab**: player store + timeline hook + Queue scene first (vertical slice), then BST, Hash, Graph, Sort, List, Stack | Each scene replays a real engine trace with scrubber + pseudo-code |
| 7 | ML train/evaluate + `/model` page + prediction card | Held-out MAE vs baseline displayed |
| 8 | Polish: empty/stale/error states, reduced motion, mobile layout, no-WebGL fallback, keyboard | Lighthouse a11y ≥ 90; works at 375 px |
| 9 | Docs, screenshots, demo recording, report | Demo script runs from clean start |

Mock layer in step 2 means the frontend never waits on the backend — swap `VITE_USE_MOCK=false` when step 4 lands.

---

## 7. Repository layout (frontend detail)

```
frontend/src/
  app/            router.tsx, providers.tsx, layout/ (Sidebar, TopBar, PillNav, ThemeToggle)
  styles/         tokens.css, globals.css
  lib/            api.ts, mock/, format.ts (°C, dates), bands.ts (heat ramp), store.ts (zustand)
  components/     KpiTile, Card, Skeleton, EmptyState, StaleBadge, ErrorState, BandBadge, Legend
  features/
    dashboard/    DashboardPage, IndiaMap, TrendChart, AlertsFeed, DsPanel
    stations/     StationPage, PredictionCard, RecentList
    history/      HistoryPage, SortPanel, BinarySearchStrip, BstPathMini
    alerts/       AlertsPage, ThresholdControl, GraphOverlay
    lab/          LabPage, PlayerBar, PseudoCode, CounterHud, Narration,
                  three/ (shared blocks), scenes/ (QueueScene, ListScene, BstScene,
                  HashScene, GraphScene, SortScene, StackScene), fallback2d/
    model/        ModelPage
  assets/geo/     india.geojson (simplified)
```

---

## 8. Updated demonstration script (adds the Lab)

1–10 as PROJECT.md, but steps 2, 3, 5, 6, 7, 8 are shown **in the Structure Lab** with "Use live data" on:
- Queue ring filling during replay → pause consumer → overflow bounce → resume.
- Hash lookup of `DEL` landing in a tall collision column.
- BST range query for May 2024 with pruned subtrees greyed.
- Merge-sort terrain → binary-search window narrowing.
- Raise threshold → graph scene paints connected hot components on the 3D India plate.
Finish on `/model` (honest baseline comparison) and backend restart showing index rebuild.

---

## 9. Risks & mitigations
| Risk | Mitigation |
|---|---|
| 3D work eats all the time | Build Queue scene end-to-end first; every other scene reuses the same blocks + player. 2D fallback exists anyway. |
| Laptop GPU stutters in viva | `frameloop="demand"`, element cap, quality toggle, 2D fallback button visible. |
| Daily data vs spec's hourly | D2/D3 documented; optional Open-Meteo hourly import if time permits. |
| Engine crash mid-demo | Auto-restart + "Engine recovering" banner (spec requirement, also demoable). |
| Offline venue | Self-hosted fonts, bundled GeoJSON, no CDN, no tiles. |

---

## 10. Reference projects reused
- `C:\Projects\demonetisation-impact-explorer` — glass `PillNav` (GSAP hover), Fraunces + Inter pairing, Framer Motion section reveals, counters, ogl background shader (`MicroSlats`) → possible subtle hero background on `/lab` only.
- `C:\Projects\mini-project` — claymorphism shadow recipes (`--clay`, `--clay-in`), light/dark theme hook (`lib/theme.js`), Recharts theme.
- `C:\Projects\HeatAlert_Control_Room` — GRD reader (`grid.py`), heat colour ramp + level colours (`theme.py`), warming-stripes idea, sidebar dashboard layout.

## 11. External references (core)
- VisuAlgo — https://visualgo.net (step narration + pseudo-code highlight model)
- USFCA DS Visualizations — https://www.cs.usfca.edu/~galles/visualization/Algorithms.html (speed/step controls)
- Algorithm Visualizer — https://algorithm-visualizer.org (tracer/event model)
- Python Tutor — https://pythontutor.com (snapshot-per-step trace format; Guo, SIGCSE 2013)
- JSAV / OpenDSA — https://github.com/vkaravir/JSAV (pseudo-code line highlighting, step filters)
- R3F performance pitfalls — https://r3f.docs.pmnd.rs/advanced/pitfalls
- Full research notes: `research_notes/HeatWatch frontend design references/` (4 files, all cited)
- React Three Fiber — https://r3f.docs.pmnd.rs · drei — https://drei.docs.pmnd.rs (View, PerformanceMonitor, Instances) · GSAP timeline labels — https://gsap.com/docs/v3/GSAP/Timeline
- 3d-force-graph — https://github.com/vasturiano/3d-force-graph (edge particles, click-to-focus camera, tree layout → graph scene)
- 3d-stack-visualization (React + R3F + Vite; stack/queue/list/tree) — https://github.com/vinayak-h/3d-stack-visualization
- R3F sorting visualizer (instanced bars, source view) — https://github.com/kkuchar2/sorting-visualizer · demo https://sortingvis.kkucharski.com
- 3D sorting in plain three.js — https://github.com/atoomnetmarc/3D-Sorting-Algorithm-Visualizer
- Codrops R3F cylinder text ring (template for the circular-queue ring) and WebGL carousel with GSAP — https://tympanus.net/codrops
- Gap found: **no existing 3D visualizer for chained hash tables, ring buffers or infix→postfix stacks** — these three scenes are original contributions worth highlighting in the report.
- Pedagogy: Hundhausen, Douglas & Stasko 2002 (J. Visual Languages & Computing); Naps et al. 2002 ITiCSE WG engagement taxonomy; Byrne, Catrambone & Stasko 1999; Munzner, *Visualization Analysis & Design* (2014)
- shadcn/ui Sidebar & Chart — https://ui.shadcn.com · Tremor blocks — https://tremor.so
- ColorBrewer — https://colorbrewer2.org · cmocean — https://matplotlib.org/cmocean
- Copernicus Climate Pulse — https://pulse.climate.copernicus.eu · Show Your Stripes — https://showyourstripes.info
- IMD heatwave criteria — https://mausam.imd.gov.in

_A deeper research appendix (design references, versions, trace-playback patterns) will be added in `reports/` when the background research completes._

---

## 12. Status (2026-11-02)

Done:
- Data: `data/prepare.py` (16 IMD grid cells, 64,288 daily readings), mock sample + normals.
- Engine (C++17): all 8 structures + traces for queue, list, BST (live + demo), hash, graph BFS/DFS, merge sort, binary search, stack formula; 92 native tests pass.
- Frontend: dashboard (raised colour-coded state map with hover pop), station, history (engine BST range + merge sort), alerts & hot regions, model, about; Structure Lab with all 7 scroll-controlled 3D dioramas.
- Static architecture: Web Worker engine client, IndexedDB persistence + index rebuild, Vercel config.
- ML: `ml/train.py` → `model.json` (test MAE 0.893 vs persistence 0.910).

Remaining for the user:
- Install Emscripten and run `engine/build.sh` to produce `frontend/public/engine/heatwatch.{js,wasm}` (until then the app uses the labelled mock + recorded traces).
- Screenshots / demo recording / report.
