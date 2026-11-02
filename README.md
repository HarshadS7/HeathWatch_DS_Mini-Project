# HeatWatch

Heatwave monitoring for 16 Indian locations, built on hand-written C++ data structures that run **in the browser** (C++17 → WebAssembly in a Web Worker). Fully static: deploys to Vercel with no backend.

Data Structures mini project · KJS-CES-01 *Climate Intelligence for Heatwave Monitoring*. Specification: `PROJECT.md`; build plan: `plan.md`.

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in frontend/dist
```

If the WebAssembly engine has not been built, the app falls back to a dev mock and the Structure Lab replays traces **recorded from the native C++ engine**. Every view says which source it is using.

## Build the C++ engine

Native build + tests (needs g++ with C++17):

```bash
bash engine/build.sh          # builds engine/build/heatwatch_engine, runs 92 tests
```

WebAssembly build (needs Emscripten, once):

```bash
cd /c/Projects && git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk.bat install latest && ./emsdk.bat activate latest   # emsdk on macOS/Linux
source ./emsdk_env.sh
bash /c/Projects/ds-mini/engine/build.sh     # also writes frontend/public/engine/heatwatch.{js,wasm}
```

Commit `frontend/public/engine/*` so Vercel only serves static files.

## Deploy (Vercel)

Import the repo, set **Root Directory = `frontend`**. Framework preset Vite; `frontend/vercel.json` rewrites client routes to `index.html`.

## Architecture

```
React app ──postMessage(JSON)──► Web Worker ──► engine.wasm (C++17)
   │                                              circular queue · linked list · BST
   ├─ service layer (replay, alerts, settings)    hash table · graph BFS/DFS
   ├─ IndexedDB (observations, alerts, settings)  merge sort · binary search · stack
   └─ model.json (next-day regression)
```

Protocol (identical for the native CLI and the worker): request `{"id","op","payload","trace"}` → response `{"id","ok","result","trace"|"error","engineTimeMs"}`.

Pipeline: replay producer → engine circular queue (explicit rejection when full, producer retries) → consumer appends to the station's linked list and BST → IndexedDB → alerts. Reloading the page restores IndexedDB and rebuilds balanced BSTs in the engine.

## Where each experiment lives

| Exp | Structure | Use in the app | Code |
|---|---|---|---|
| 1 | Array of structures | Station records | `engine/include/structures.hpp` `StationArray` |
| 2 | Singly linked list | Bounded recent history per station | `History` |
| 3 | Stack | Formula infix → postfix → value; DFS frontier | `Stack`, `opStackEval` |
| 4 | Circular queue | Buffer between replay and processing | `CircularQueue` |
| 5 | Binary search tree | Per-station date index, range queries | `BST`, `bst.range` |
| 6 | Graph + BFS/DFS | Connected hot regions (cells within 450 km) | `Graph`, `graph.components` |
| 7 | Merge sort + binary search | History explorer sort; search on sorted output | `opSort`, `opBinarySearch` |
| 8 | Hash table (separate chaining) | Station-ID → index, resize at load 0.75 | `HashTable`, `hash.lookup` |

No `std::queue/list/map/unordered_map/sort` in the assessed structures. JSON handling (`json.hpp`) and trace logging are infrastructure.

## Structure Lab

`/lab` shows every structure as a 3D diorama driven by **engine traces**: each step carries the event, pseudo-code line, narration, variables, counters and a full state snapshot. Click the stage, then scroll (or use arrow keys) to step forward/back; Esc releases the scroll. `?step=N` deep-links a frame. The raw trace drawer shows the JSON the engine produced.

## Data

- **IMD Pune** — Daily Maximum Temperature, 1.0° × 1.0° gridded binary (`Maxtemp_MaxT_2015–2025.GRD`). Stations are the grid cells nearest 16 cities, **not physical sensors**. `data/prepare.py` → `data/sample/*.csv`.
- **IMD** All-India monthly series 1901–2025 (`imd_all_india_1901_2025.csv`).
- India / state boundaries: DataMeet (CC BY 2.5 IN), simplified.
- No humidity in the IMD grid, so it is shown as unavailable rather than invented.

Monitoring bands follow IMD plains criteria (≥ 40 °C with departure ≥ 4.5 °C, or ≥ 45 °C; severe > 6.4 °C or ≥ 47 °C) but are **illustrative, not official declarations**. Normals are a 2015–2024 15-day-window mean (short baseline).

## Prediction

`python ml/train.py` (scikit-learn) → `frontend/public/model.json`. Next-day max temperature from lags t0–t3, 7-day mean and season; chronological split (train 2015–22, validation 2023, test 2024–25).

| Test 2024–25 | MAE |
|---|---|
| Linear regression | 0.893 °C |
| Persistence (tomorrow = today) | 0.910 °C |

The model only marginally beats persistence; the app reports exactly that.

## Tests

`engine/tests/tests.cpp` covers the PROJECT.md verification list: queue empty/full/wraparound/repeated fill-drain, list eviction, BST deletion cases/duplicates/skew/balanced rebuild, hash collisions/resize/delete, graph isolated hot vertices, stable merge sort, binary-search miss, formula precedence/unary minus/division by zero/unbalanced brackets, and protocol errors.

`python engine/record_fixtures.py` re-records the Lab's fallback traces from the native engine.
