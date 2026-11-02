# Trace-Driven Algorithm Playback UI Design (trace format + player for HeatWatch)

Scope: how existing algorithm and program visualizers structure step traces and play them back, what the education research says about which UI features matter, and a concrete trace schema and React player design for HeatWatch (C++17 engine -> NDJSON -> FastAPI -> React, ideally 3D). Research date: 2026-11-02. Source code was read directly from GitHub raw files where noted. Claims I could not verify are marked "(unverified)" or listed under Gaps.

---

## 1. How do existing tools structure traces and events?

### Takeaway
Two families exist. **Command/delta streams**: algorithm-visualizer.org's `{key, method, args}` commands split by `delay` markers, USFCA Galles' string command queue split by `Step`, and JSAV's recorded operation stacks with undo functions. **Full-snapshot-per-step traces**: Python Tutor stores the complete stack and heap at every execution point. All of them compute the whole trace first and then let the user scrub through it. Backward stepping is done one of three ways: replay from the start (algorithm-visualizer), undo stacks (JSAV, Galles), or reading a stored snapshot (Python Tutor).

### Cited Findings

**algorithm-visualizer.org (tracers.js plus the React web app)**
- Architecture: the web app is a React app that "contains UI components and interprets commands into visualizations"; the `tracers.*` libraries (one per language) "extract visualizing commands from code"; a `server` repo compiles and runs code. — [algorithm-visualizer README](https://github.com/algorithm-visualizer/algorithm-visualizer)
- The command format is exactly `interface Command { key: string | null, method: string, args: Array<any> }`. Each tracer object gets a random 8-character `key` when constructed. The constructor itself emits a command whose `method` is the class name (e.g. `Array1DTracer`). Args are deep-copied with `JSON.parse(JSON.stringify(args))`, so every command is a value snapshot of its arguments. Limits are `MAX_COMMANDS = 1000000` and `MAX_OBJECTS = 100`. — [tracers.js src/Commander.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Commander.ts)
- `Tracer.delay(lineNumber?)` emits `{key: null, method: 'delay', args:[lineNumber]}`, documented as "Pause to show changes in all tracers." The `lineNumber` is "the line number to indicate when paused". This is how the code-line highlight gets linked to steps. — [tracers.js src/Tracer.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Tracer.ts)
- Array1DTracer vocabulary: `set(array)`, `patch(x, v)` ("Notify that a value has been changed"), `depatch(x)`, `select(sx, ex?)`, `deselect(sx, ex?)`, `chart(chartTracer)`. — [tracers.js src/Array1DTracer.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Array1DTracer.ts)
- GraphTracer vocabulary: `set(adjMatrix)`, `directed()`, `weighted()`, `layoutCircle()`, `layoutTree(root, sorted)`, `layoutRandom()`, `addNode/updateNode/removeNode`, `addEdge/updateEdge/removeEdge`, `visit(target, source?, weight?)`, `leave(target, source?, weight?)`, `select/deselect(target, source?)`, `log(logTracer)`. — [tracers.js src/GraphTracer.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/GraphTracer.ts)
- Other tracers in the repo: Array2DTracer, ChartTracer, LogTracer (`println`), ScatterTracer, plus Layout/VerticalLayout/HorizontalLayout (`Layout.setRoot(new VerticalLayout([...]))`). — [tracers.js repo tree / README](https://github.com/algorithm-visualizer/tracers.js)
- Player: on load, the frontend groups the flat command list into **chunks**, starting a new chunk at each `delay` command and storing that delay's `lineNumber` on the chunk. The cursor indexes chunks. Play is a `setTimeout` loop with interval `4000 / Math.pow(Math.E, speed)`, so the speed slider is exponential. The progress-bar handler maps a fraction to `Math.round(progress * chunks.length)`. — [algorithm-visualizer src/components/Player/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/Player/index.js)
- Seeking: when `cursor > oldCursor` the viewer applies only the new chunks. Otherwise it calls `this.reset()` and **re-applies every chunk from 0 to cursor**, so backward seeking means replaying from the beginning. `applyCommand` dispatches `this.objects[key][method](...args)` onto mutable frontend tracer objects. — [algorithm-visualizer src/components/VisualizationViewer/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/VisualizationViewer/index.js)
- tracers.js was last pushed 2023-02-27 (GitHub API `pushed_at`), so the project looks largely dormant. — [GitHub API repos/algorithm-visualizer/tracers.js](https://api.github.com/repos/algorithm-visualizer/tracers.js)

**Python Tutor (Online Python Tutor, Philip Guo)**
- The trace is "a JSON object with two fields: `code` ... and `trace` ... a list of execution points". The doc adds: "the trace object contains *all* of the information required to create this visualization". — [opt-trace-format.md (JuezUN fork mirror)](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- Each execution point carries `line` (the line *about to execute*), `event`, `func_name`, `globals`, `ordered_globals` (a separate ordered list because JSON object keys are unordered), `stack_to_render`, `heap`, and `stdout`. — [opt-trace-format.md (mirror)](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- Event types: `step_line`, `call`, `return` ("every frame should have matching `call` and `return` entries"), `exception`, `uncaught_exception` (a single-entry trace with this event is shown as a syntax error on the faulting line with `exception_msg`), and `instruction_limit_reached` ("if you want to cap execution at a certain limit (e.g., 300 executed steps), issue this special event at the end"). — [opt-trace-format.md (mirror)](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- Heap encoding: variables hold `["REF", id]`, and heap objects are tagged arrays such as `["LIST", 1, 2, 3]`, `["TUPLE", 1, ["REF", 2]]`, and `["DICT", ...]`. "The ability to put 'REF' objects inside of heap objects enables an arbitrary object graph". Linked lists are encoded this way, e.g. `["TUPLE", 2, null]`. — [opt-trace-format.md (mirror)](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- Known cost: `stdout` is cumulative at every step, so it "suffers from N^2 space explosions". — [opt-trace-format.md (mirror)](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- SIGCSE 2013 paper: the backend runs code under Python's `bdb` debugger, "which stops execution after every executed line and records the program's run-time state". The backend "halts execution after 300 executed lines". "The trace contains a great deal of redundancy, since it stores a complete snapshot of the stack and heap at every execution point. Traces ... range from 10KB to 200KB ... We have not found backend running times or trace sizes to be performance bottlenecks in practice". — [Guo, SIGCSE 2013 PDF](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Frontend UI from the paper: "A red arrow in the left margin points to the next line to be executed ... A light green arrow points to the line that has just executed, which helps users track non-contiguous control flow". There is "a slider bar and text ... (step 11 of 21)" plus "VCR-style navigation buttons". "Generate URL" encodes the program and the exact step. "All interactions occur in the browser with no additional server calls; thus, stepping forwards and backwards refresh the display instantaneously." — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Layout stability heuristics from the paper: objects are "stacked vertically in the order in which they were created", and "Once an object has been rendered, it stays in the same location ... This heuristic makes objects not 'jiggle' around". — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Decoupling: the trace "is not tied to any particular visualization". Users suggested rendering "an audio 'reading' of execution states to help teach visually-impaired students". Textbook authors precomputed traces offline and embedded them as JSON. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Sorva's survey of 40 program visualization tools found they "all look similar": a code pane with the current line highlighted, a run-time state pane, and controls to "step forwards and backwards". — [Guo 2013, citing Sorva](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Availability caveat: `api.github.com/repos/pgbovine/OnlinePythonTutor` returned HTTP 404 on 2026-11-02, and so did the canonical doc URL. The original repo appears to have been removed or made private, so the doc was read from the JuezUN fork. The fork's header still points to the pgbovine URL. — [GitHub API check](https://api.github.com/repos/pgbovine/OnlinePythonTutor); [mirror](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)

**JSAV (Aalto, used by OpenDSA)**
- Recording model: `av.step()` pushes a new empty `AnimStep` onto `_undo` while recording. Each animatable operation is stored as "[target object, effect function, arguments, undo function]". `backward()` pops a step from `_undo`, calls `undo()` on each operation in reverse, and unshifts the step onto `_redo`. `forward()` re-applies the operations. `backward`/`forward` accept a filter, so the player can skip to the next step matching a predicate. — [JSAV src/anim.js](https://github.com/vkaravir/JSAV/blob/master/src/anim.js)
- `av.recorded()` ends recording: it removes a trailing empty step, rewinds to the beginning (`this.begin()`), and logs `jsav-recorded`. `displayInit()` marks the initial state shown to the user, and `jumpToStep(n)` exists. `totalSteps()` returns `_undo.length + _redo.length`. — [JSAV src/anim.js](https://github.com/vkaravir/JSAV/blob/master/src/anim.js)
- Controls are bound to the left and right arrow keys ("allow stepping the slideshow with the left/right arrow keys"), and forward/backward events are logged for analytics (`logAnimEvent("jsav-forward")`). — [JSAV src/anim.js](https://github.com/vkaravir/JSAV/blob/master/src/anim.js)
- Pseudocode API: `av.code(codelines, options)` with `highlight(linenum)`, `unhighlight(linenum)`, and `setCurrentLine(linenum)`. Like other operations, these are recorded as animatable steps. — [JSAV src/code.js](https://github.com/vkaravir/JSAV/blob/master/src/code.js)
- JSAV source also includes `exercise.js` and `questions.js`, the basis for OpenDSA's interactive "proficiency exercises" and pop-up questions. The repo was still being pushed as of 2026-09-24. — [JSAV repo tree](https://github.com/vkaravir/JSAV); [GitHub API](https://api.github.com/repos/vkaravir/JSAV)

**USFCA Galles visualizations**
- Algorithm code emits string commands, e.g. `this.cmd("CreateHighlightCircle", id, color, x, y)`, `this.cmd("Move", id, x, y)`, `this.cmd("SetForegroundColor", ...)`, `this.cmd("Step")`. — [Galles BST.js](https://www.cs.usfca.edu/~galles/visualization/AlgorithmLibrary/BST.js)
- The animation manager splits each command on the `"<;>"` delimiter and runs commands until it reaches a `STEP`. For every command it builds an inverse, e.g. `undoBlock.push(new UndoCreate(id))`, and the inverses are pushed onto `undoStack` for "Step Back". The command vocabulary includes CREATECIRCLE, CONNECT, DISCONNECT, CREATERECTANGLE, MOVE, SETHIGHLIGHT, SETTEXT, SETALPHA, DELETE, CREATELABEL, SETEDGECOLOR, SETEDGEHIGHLIGHT, CREATELINKEDLIST, SETNULL, CREATEBTREENODE, SETPOSITION, ALIGNRIGHT/LEFT/TOP/BOTTOM, SETHIGHLIGHTINDEX, and others. — [Galles AnimationMain.js](https://www.cs.usfca.edu/~galles/visualization/AnimationLibrary/AnimationMain.js)
- `StartNewAnimation(commands)` pushes the previous operation's undo indices onto `undoAnimationStepIndicesStack`, so Step Back can cross into earlier operations. This is relevant to HeatWatch, where each API call (insert 5, insert 3, ...) is a separate operation. — [Galles AnimationMain.js](https://www.cs.usfca.edu/~galles/visualization/AnimationLibrary/AnimationMain.js)

**VisuAlgo**
- VisuAlgo has three modes: e-Lecture (tutorial slides that open by default for first-time visitors), Exploration (step-by-step animation), and Training (an online quiz with randomly generated questions, auto-grading, and configurable difficulty, time limit, and number of questions). There is also a controlled "test mode" used in NUS exams. — [visualgo.net](https://visualgo.net/); [Medium review](https://medium.com/swlh/visualgo-a-simple-visualization-tool-or-something-more-58822beb376b); [NUS feature](https://www.comp.nus.edu.sg/features/2020stevenhalim)

### Inferences
- The shared pattern is "**precompute the full trace, then scrub locally**". Python Tutor, algorithm-visualizer, JSAV (`recorded()`), and Galles all compute every step before playback. This fits HeatWatch directly: the C++ engine does all the computation, and the frontend only renders.
- The algorithm-visualizer `delay` chunk is the closest analogue to a HeatWatch "step": a step is a group of state changes plus a pseudocode line.
- Python Tutor shows that the simplest robust design (a full snapshot every step) is fine at teaching scale, and HeatWatch's structures are smaller still (tens of nodes).
- The undo-function approach (JSAV, Galles) suits imperative jQuery/canvas renderers. In React, deriving each frame from immutable state is simpler and makes reverse transitions correct by construction.

### Gaps
- VisuAlgo's internal step and state format is not public (closed source), so I could not verify how it represents steps. (Unverified recollection: it passes an array of full per-step widget states. Do not cite.)
- Manim scene steps were not researched in depth. Manim renders to video offline rather than being an interactive scrubbable player, so it is a weak model for a seekable UI (inference, not sourced).
- I did not read the Python Tutor frontend source to see exactly how it diffs snapshots for transitions.

---

## 2. Recommended trace event schema: snapshot vs delta, seeking, pseudo-code mapping, counters, narration

### Takeaway
For HeatWatch, use a **hybrid**: each step carries a small **semantic event** (what happened, for animation and narration) *and* a **full state snapshot** (what is true now, for idempotent seeking). Add `line` for the pseudocode, cumulative `counters`, pointer `vars`, and `note` narration. The engine assigns stable object IDs. Data volumes are tiny, so keyframe+delta compression is unnecessary. Python Tutor's precedent supports this.

### Cited Findings
- Full snapshots trade size for simplicity: Python Tutor stores "a complete snapshot of the stack and heap at every execution point", 10-200KB per trace, without performance bottlenecks at pedagogical scale. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Snapshot pitfall: fields that grow cumulatively (stdout) cause N^2 growth. — [opt-trace-format.md](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)
- Delta pitfall: with commands only (algorithm-visualizer), seeking backward requires `reset()` plus replaying chunks 0..cursor. — [VisualizationViewer/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/VisualizationViewer/index.js). Undo-based deltas (JSAV, Galles) require an inverse for every operation. — [JSAV anim.js](https://github.com/vkaravir/JSAV/blob/master/src/anim.js); [Galles AnimationMain.js](https://www.cs.usfca.edu/~galles/visualization/AnimationLibrary/AnimationMain.js)
- Line semantics need to be explicit. Python Tutor's `line` is the line *about to execute*, and its UI shows both the "just executed" and "next" lines. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf). algorithm-visualizer attaches the line to the pause (`delay(lineNumber)`). — [Tracer.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Tracer.ts)
- Stable identity: Python Tutor uses heap ids (`["REF", id]`) and keeps objects in place "until there are no more pointers to it". — [opt-trace-format.md](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md); [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf). Galles and tracers.js also address objects by integer or string IDs. — [Galles BST.js](https://www.cs.usfca.edu/~galles/visualization/AlgorithmLibrary/BST.js); [Commander.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Commander.ts)
- Step caps and truncation signals are standard: OPT halts at 300 lines and emits `instruction_limit_reached` with a message. tracers.js throws "Too Many Commands" past 1,000,000. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf); [Commander.ts](https://github.com/algorithm-visualizer/tracers.js/blob/master/src/Commander.ts)
- Errors as traces: OPT represents a failure as a trace whose final or only entry is an exception event with `exception_msg` and the faulting line. — [opt-trace-format.md](https://github.com/JuezUN/OnlinePythonTutor/blob/master/v3/docs/opt-trace-format.md)

### Inferences (proposed HeatWatch schema)

**Envelope** (one NDJSON line from the engine; FastAPI passes it through):
```json
{
  "id": "req-42", "ok": true, "structure": "bst", "op": "insert", "args": {"key": 42},
  "result": {"inserted": true},
  "trace": {
    "version": 1,
    "algorithm": "bst.insert",            // selects the pseudocode listing on the frontend
    "pseudocode": ["if root == null: ...", "..."],   // optional; or keep listings keyed by algorithm
    "initial": { /* full snapshot before op */ },
    "steps": [ /* Step[] */ ],
    "truncated": false, "max_steps": 2000
  },
  "state": { /* final snapshot == steps[last].state */ }
}
```

**Step**:
```json
{
  "i": 3,
  "event": {"type": "compare", "a": "n7", "b": 42, "outcome": "lt"},
  "line": 4,
  "note": "42 < 50, so go to the left child",
  "vars": {"cur": "n7", "parent": "n2", "key": 42},
  "counters": {"comparisons": 3, "visits": 3},
  "highlight": {"n7": "active", "n2": "path"},
  "state": { /* full snapshot after this step */ }
}
```

- **Event vocabulary** (small and closed, so it can be explained in a viva): `init, compare, visit, enqueue, dequeue, push, pop, read, write, swap, link, unlink, alloc, free, hash, probe, split, merge, found, not_found, overflow, underflow, error, done`. This parallels Array1DTracer's `patch/select` and GraphTracer's `visit/leave/addEdge` vocabulary.
- **Per-structure snapshot shapes** (keyed by stable engine IDs):
  - Circular queue: `{capacity, buf:[...], front, rear, size}` (draw as a ring; front and rear are pointer markers).
  - Linked list: `{head, nodes:{id:{val,next}}}`.
  - BST: `{root, nodes:{id:{key,left,right}}}`, plus `height`. Layout is computed on the frontend from structure only, which keeps it deterministic.
  - Hash table (chaining): `{m, buckets:[[ids]], entries:{id:{key,val}}, load_factor}`. The `hash` event carries `{key, h, bucket}`, and `probe` steps walk the chain.
  - Graph BFS/DFS: `{nodes, edges, visited:[...], frontier:[...] (queue or stack order), parent:{}, order:[...]}`.
  - Merge sort: `{array, aux, ranges:[{lo,mid,hi,depth}], active:{lo,hi}}`. Binary search: `{array, lo, hi, mid}`.
  - Stack infix to postfix: `{tokens, idx, stack:[...], output:[...]}`.
- **Why the hybrid?** `state` makes seeking idempotent: `render(steps[k].state)` is the same no matter how the user arrived at step k. `event` tells the animation layer *how* to move from k-1 to k (an arc for a pointer move, a pulse for a compare) and drives the narration. Animating backward means tweening from `state[k]` to `state[k-1]`, so no undo functions are needed.
- **Keyframes plus deltas** become worthwhile only if traces get large (e.g. more than ~5k steps, or merge sort on thousands of elements). In that case, store `state` every K steps and `delta` (a JSON-patch-like list) otherwise, and seek by applying the deltas after the nearest keyframe. For HeatWatch-sized inputs this is probably over-engineering (inference).
- **Counters** are cumulative per step, not per-step increments, so the HUD shows `steps[k].counters` directly with no summing on the frontend. That keeps the frontend free of algorithm logic, which satisfies the "no faking" rule.
- **Line mapping**: document `line` as "the line being executed at this step" and keep the pseudocode listing in a single source of truth: either the engine emits it, or the frontend holds a map keyed by `algorithm`. The engine should define the line numbers.
- **Narration**: the engine produces `note` (so it is ground truth), or the frontend builds it from a template over `event`. Either way it must come from trace fields, not invented text.
- **Limits**: cap steps in the engine, set `truncated:true`, and append a final `{event:{type:"error",reason:"step_limit"}}`, following OPT's `instruction_limit_reached`.
- **Errors**: overflow on a full circular queue or pop on an empty stack should still return a trace whose last step is `overflow`/`underflow` on the relevant line, following OPT's exception-entry model.
- **Multi-operation history**: keep a session timeline of traces (one per API call), so the user can step back across operations, as Galles' `undoAnimationStepIndicesStack` does.
- **Verifiability for grading**: put `engine_version` and the request `args` in the envelope, and include a "raw trace" JSON viewer tab in the UI, so faculty can see the animation is driven by engine output.

### Gaps
- I found no published standard schema for algorithm traces beyond tool-specific formats (OPT's is the most documented).
- No benchmarks were found comparing snapshot and delta performance in React or three.js at this scale. The size recommendation is an inference from OPT's numbers.

---

## 3. Playback UI patterns (controls, scrubber, pseudocode, watch panel, HUD, quiz, compare, accessibility)

### Takeaway
The de facto standard layout has three parts: a code pane with the current line highlighted, a state pane, and VCR controls with a slider and step counter. Python Tutor adds just-executed and next-line arrows, plus deep links to a step. JSAV adds arrow-key stepping, event logging, and embedded questions. VisuAlgo adds e-lecture and quiz modes. For accessibility, step narration goes in a `polite` live region that exists in the DOM before it is updated.

### Cited Findings
- Common layout across 40 tools: code pane with highlighted line, state pane, and forward/backward controls. — [Guo 2013 citing Sorva](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- Python Tutor controls: a slider you can click or drag to jump, "step 11 of 21" text, VCR buttons, two line arrows (green for just executed, red for next), highlighting of the active frame with dimmed arrows from other frames "to reduce visual clutter", and a shareable URL that includes the step. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- algorithm-visualizer controls: play/pause, prev/next, an exponential speed slider (`4000/e^speed` ms), a draggable progress bar, and a line indicator from `delay`. — [Player/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/Player/index.js)
- JSAV: left and right arrow keys step the slideshow; forward and backward support filters (jump to the next step matching a condition); forward/backward events are logged. — [JSAV anim.js](https://github.com/vkaravir/JSAV/blob/master/src/anim.js)
- VisuAlgo: an e-Lecture mode, an Exploration (animation) mode, and a Training quiz mode with random questions and instant grading. — [visualgo.net](https://visualgo.net/)
- Galles: separate "Step Back" and "Step Forward" buttons, which are enabled only while paused in step mode (button enable/disable logic in source). — [Galles AnimationMain.js](https://www.cs.usfca.edu/~galles/visualization/AnimationLibrary/AnimationMain.js)
- ARIA live regions: `polite` updates are announced "at the next graceful opportunity". Use `off` for very frequent updates, and reserve `assertive` for urgent cases ("don't use the `assertive` value unless the interruption is imperative"). The region should be present (empty) at page load and then have its text updated, because content added after the accessibility tree is built "may not be noticed". `aria-atomic` reads the whole region. — [MDN aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)
- Python Tutor's trace was suggested as a basis for audio "reading" for visually impaired students, which shows that a semantic trace enables non-visual renderers. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)

### Inferences (proposed HeatWatch player UI)
- **Transport bar**: First / Prev / Play-Pause / Next / Last, a speed control (e.g. 0.25x-4x, applied as a multiplier on a base step duration), and "Step k / N".
- **Scrubber timeline** with **event markers**: colour-coded ticks by `event.type` (compare, found, overflow, merge). Clicking a marker seeks there. Add "jump to next <event type>", which corresponds to JSAV's filtered forward/backward.
- **Pseudocode panel**: highlight `steps[k].line`, and optionally a faint marker on `steps[k-1].line` (Python Tutor's two-arrow idea). Clicking a line could jump to the next step that executes it.
- **Watch panel**: `steps[k].vars`. In the 3D scene, show pointer variables as labelled arrows or markers attached to node IDs (`cur`, `parent`, `front`, `rear`, `lo/mid/hi`, `top`).
- **HUD**: `steps[k].counters` plus the theoretical bound for the operation (e.g. "BST height h = 5, comparisons 3 of at most h+1"). Show live load factor for the hash table and frontier size for BFS/DFS.
- **Narration strip**: `steps[k].note`, mirrored into an `aria-live="polite"` region. During auto-play, announce only on pause (or throttle) so the screen reader is not flooded. MDN's guidance to use `off` for rapid updates applies here.
- **Keyboard**: Space for play/pause, Left/Right to step (as in JSAV), Home/End for first/last, Shift+Left/Right to jump to the previous/next marker event, and +/- for speed. All controls should be real `<button>`s with labels, and the slider should be `<input type=range>` with `aria-valuetext="Step 7 of 21: compare 42 with 50"`.
- **Predict mode** (quiz): pause before steps whose event type the student can predict (e.g. the next BST direction, the next BFS node, the hash bucket, the next postfix output). Offer 2-4 choices derived from `steps[k+1]`, then reveal. The correct answer comes from the trace, so it stays honest. This is grounded in the prediction research (section 4).
- **Compare mode**: two players driven by one shared clock or step index, e.g. BST from sorted input vs random input (height and comparisons diverge), linear vs binary search, BFS vs DFS on the same graph. Because counters are cumulative, putting the HUDs side by side tells the story.
- **Deep link**: encode `{structure, op, args, step}` in the URL, as Python Tutor does.
- **Reduced motion**: respect `prefers-reduced-motion` by cutting directly between snapshots instead of tweening. The snapshot design makes this trivial (inference).
- **Raw trace inspector**: a collapsible JSON view of `steps[k]`, which is useful evidence in the viva that nothing is faked.

### Gaps
- I did not find empirical studies isolating the value of individual controls (speed slider, scrubber markers).
- I did not verify VisuAlgo's exact keyboard shortcuts or its playback-speed UI.
- I did not research 3D-specific accessibility guidance (e.g. for WebGL canvases). Keeping an equivalent DOM text representation of the state is an inference.

---

## 4. Research on algorithm animation effectiveness that bears on UI choices

### Takeaway
The research consistently says that **what learners *do* with a visualization matters more than how it looks**. Prediction, answering questions, and changing inputs beat passive viewing. A polished 3D animation alone is not enough: HeatWatch should build in prediction prompts, user-chosen inputs, and comparison.

### Cited Findings
- Hundhausen, Douglas & Stasko (2002), "A Meta-Study of Algorithm Visualization Effectiveness", *J. Visual Languages & Computing* 13(3):259-290, DOI 10.1006/jvlc.2002.0237. It is a meta-study of 24 experimental studies. Its central conclusion, as summarized in the abstract, is that how students use AV technology matters more than what the visualizations show. Cognitive constructivism had the highest predictive success among the learning theories examined. — [academia.edu abstract](https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness); [dblp](https://dblp1.uni-trier.de/rec/bibtex/journals/vlc/HundhausenDS02)
- A secondary summary reports that over 40% of the 24 studies found no significant effect. This comes from lecture slides, not the paper itself, so verify before quoting. — [Saarland lecture slides](https://www.rw.cdl.uni-saarland.de/people/diehl/private/SoftVisVorles/slides/07_SV_EducationEvaluation.pdf)
- Naps et al. (2002/2003), ITiCSE working group report "Exploring the Role of Visualization and Engagement in Computer Science Education" (ACM SIGCSE Bulletin 35(2):131-152). It proposes an engagement taxonomy grounded in Bloom's taxonomy, with levels No Viewing, Viewing, Responding, Changing, Constructing, and Presenting. The core hypothesis is that higher engagement gives better learning outcomes. Sources differ on whether to cite it as ITiCSE proceedings or SIGCSE Bulletin. — [Crossref/DOI 10.1145/960568.782998 via search listing](https://cir.nii.ac.jp/crid/1360574096426136704?lang=en); [SciTePress 2009 paper describing the levels](https://www.scitepress.org/Papers/2009/18251/pdf/index.html)
- Myller et al. later proposed an Extended Engagement Taxonomy with 10 levels. — [SciTePress 2009](https://www.scitepress.org/Papers/2009/18251/pdf/index.html)
- Byrne, Catrambone & Stasko (1999), "Evaluating animations as student aids in learning computer algorithms", *Computers & Education* 33(4):253-278. Two experiments (DFS, binomial heaps) found that asking learners to **predict** the algorithm's behaviour helped. A similar improvement appeared when prediction was done with static diagrams, so the authors concluded that "prediction, rather than animation per se, may have been the key factor". — [UW course PDF](https://courses.cs.washington.edu/courses/cse591e/02sp/readings/evaluating_animations.pdf); [record](https://ersearch2.cvtisr.sk/vufind/SummonRecord/FETCH-LOGICAL-c335t-34f3b0c99eb2275c0df22d1075ac59be3e6a2168cd0e050a8516b5b1040b4bd73)
- Grissom, McNally & Naps (2003), "Algorithm Visualization in CS Education: Comparing Levels of Student Engagement", SOFTVIS 2003, pp. 87-94, is a direct test of the engagement levels. I could not retrieve its results. — [dblp](https://dblp.uni-trier.de/rec/conf/softvis/GrissomMN03.html)
- Python Tutor (Guo 2013) reports adoption (over 30,000 unique IPs per month, embedded in three digital textbooks) rather than a controlled learning-gain study. It lists limitations: it steps one line at a time without sub-expression detail, and it handles only several hundred steps. — [Guo 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf); [Google Research listing](https://research.google/pubs/pub40591/)

### Inferences
- Map HeatWatch features to the Naps levels for the viva: **Viewing** = playback; **Responding** = predict-the-next-step quiz; **Changing** = user-entered inputs and operations sent to the real engine (also the evidence that nothing is faked); **Constructing/Presenting** = possibly "build the BST yourself, then compare with the engine's trace" (a stretch goal).
- Byrne et al. justify predict mode as the highest-value add-on. It works even without heavy animation, so 3D polish should not be prioritized over interaction.
- Hundhausen's conclusion suggests the grading story should stress interactivity and engine-driven truth, not visual fidelity.

### Gaps
- I did not access the full texts of Hundhausen 2002 or Grissom 2003, so effect sizes and per-level outcomes are not reported here.
- I found no controlled studies of 3D vs 2D algorithm animation. Claims that 3D aids learning would be unsupported, and 3D may add cognitive load (untested inference).
- I did not find more recent (2020-2026) meta-analyses in this pass. A follow-up search is worthwhile (e.g. ITiCSE working group reports on AV, or Sorva's 2013 TOCE review of program visualization).

---

## 5. React implementation patterns for a deterministic player

### Takeaway
The simplest robust design is a **pure reducer over a precomputed, immutable trace**: state = `{traces, opIndex, step, playing, speed}`. The view derives everything from `trace.steps[step]`. A timer or `requestAnimationFrame` loop dispatches `NEXT`. In 3D (react-three-fiber), let the reducer or store choose the target snapshot and do the tweening imperatively in `useFrame` with refs, never through `setState` every frame. Plain `useReducer` (or a small zustand store) is enough. XState is optional and probably overkill.

### Cited Findings
- React recommends built-in `useState`/`useReducer` "when possible", and says `useSyncExternalStore` "is mostly useful if you need to integrate with existing non-React code". Its `getSnapshot` "must be immutable" and must return a cached value while nothing has changed, otherwise React loops infinitely with "The result of getSnapshot should be cached". — [react.dev useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- React Three Fiber pitfalls: "You might be tempted to setState inside useFrame but there is no reason to". Use refs and mutation for fast updates, read fast-changing zustand state imperatively (`useFrame(() => (ref.current.position.x = api.getState().x))`), and place animations in the frame loop "using lerp, or damp". "Use deltas instead of fixed values so that your app is refresh-rate independent". — [R3F docs: Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- Prior art: algorithm-visualizer keeps `chunks` and `cursor` in Redux and uses `setTimeout` for play. Its renderers mutate tracer objects, which is why backward seeks need a full replay. — [Player/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/Player/index.js); [VisualizationViewer/index.js](https://github.com/algorithm-visualizer/algorithm-visualizer/blob/master/src/components/VisualizationViewer/index.js)

### Inferences (recommended implementation)
```ts
type PlayerState = { traces: Trace[]; op: number; step: number; playing: boolean; speed: number };
type Action =
  | { type: 'LOAD'; trace: Trace }        // append a new engine response, jump to its step 0
  | { type: 'SEEK'; op?: number; step: number }
  | { type: 'NEXT' } | { type: 'PREV' } | { type: 'PLAY' } | { type: 'PAUSE' }
  | { type: 'SPEED'; speed: number };

function reducer(s: PlayerState, a: Action): PlayerState {
  const n = s.traces[s.op]?.steps.length ?? 0;
  switch (a.type) {
    case 'NEXT': return s.step + 1 < n ? { ...s, step: s.step + 1 }
                 : s.op + 1 < s.traces.length ? { ...s, op: s.op + 1, step: 0 } : { ...s, playing: false };
    case 'PREV': return s.step > 0 ? { ...s, step: s.step - 1 }
                 : s.op > 0 ? { ...s, op: s.op - 1, step: s.traces[s.op - 1].steps.length - 1 } : s;
    case 'SEEK': return { ...s, op: a.op ?? s.op, step: clamp(a.step, 0, n - 1), playing: false };
    // ...
  }
}
// const cur = traces[op].steps[step]; every panel renders from `cur` only.
```
- **Play loop**: a `useEffect` keyed on `[playing, speed, op, step]` sets one `setTimeout(() => dispatch({type:'NEXT'}), base/speed)`. It is cleared on every change, so there are no stale intervals. Seeking always pauses, as algorithm-visualizer does.
- **3D layer**: each mesh is keyed by the engine's stable node ID. Target positions and colours come from a pure layout function, `layout(cur.state)`. `useFrame` damps each mesh toward its target using `delta`. Seeking backward then animates backward automatically, and a jump of 50 steps simply lands on the final layout. Inserted IDs fade or scale in, and freed IDs fade out.
- **Determinism and testability**: the reducer and `layout()` are pure functions, so they can be unit-tested with recorded engine traces (golden files). This is also a clear thing to explain in the viva.
- **Where zustand helps**: when the 3D canvas and the DOM panels sit in separate trees, or when `useFrame` needs `getState()` without re-rendering. Zustand is built on `useSyncExternalStore` (unverified for the current version, check the zustand docs). XState adds value only if the play/predict/compare modes grow complex guards. Otherwise a reducer with a `mode` field suffices.
- **Fetching**: keep the network out of the player. FastAPI returns the full trace and the reducer loads it, so the frontend makes no server calls while scrubbing, the same property Python Tutor highlights.

### Gaps
- I did not verify current zustand or XState versions and APIs (late 2026), or whether `@react-three/drei` / `maath` `easing.damp` helpers are still the recommended tween utilities.
- I found no published reference implementation of a React trace player with snapshot seeking to cite directly. The code above is a design proposal, not sourced code.
