# Interactive and 3D Data-Structure / Algorithm Visualization References (for the HeatWatch DS showcase page)

Research date: 2026-11-02. Each fact below comes with a source. Anything I could not confirm in this session is in the Gaps sections. "Live" means the page loaded or showed current content during this session.

---

## Q1. What do VisuAlgo, USFCA (Galles), algorithm-visualizer.org and d3 / three.js / R3F demos do well (step controls, speed, pseudo-code highlighting, narration, counters, color)?

### Takeaway
The strongest 2D references (VisuAlgo, USFCA) are built around three things: learner-controlled playback (step back and forward, play/pause, speed), user-supplied input (create, insert, search, remove with your own values), and an explanatory layer (e-Lecture slides, status text, code trace). algorithm-visualizer.org contributes a different and very relevant model. Code emits "tracer" commands, and a renderer replays them. That is the same architecture HeatWatch needs for C++ engine traces.

### Cited Findings

**VisuAlgo (https://visualgo.net/en), live**
- Project leader and advisor is Assoc. Prof. Steven Halim (NUS School of Computing). He started it in 2011, with Dr Felix Halim as co-leader. The site lists 24 modules, including Array, Sorting, Linked List, Binary Heap, Hash Table, BST, Graph Traversal, MST and Network Flow. It refers to AY 2025/26, so it is current. — [VisuAlgo home](https://visualgo.net/en)
- Users can enter their own inputs, including drawing graphs in the nine graph modules. There are two display scales (1.0x and 0.5x, where 0.5x fits larger cases), and playback speed can be saved to an account. — [VisuAlgo home](https://visualgo.net/en)
- Every module has an "e-Lecture Mode", shown automatically to first-time and logged-out visitors. Every module also has an Online Quiz with randomly generated questions and near-instant grading, reached through a "Training" button. — [VisuAlgo home](https://visualgo.net/en)
- Pages can be opened side by side in two windows to compare algorithms or structures. — [VisuAlgo home](https://visualgo.net/en)
- BST page media bar:
  - Main bar: rewind 7 frames, pause, play, forward 7 frames, plus a "1x" speed indicator.
  - Second bar: go-to-beginning, previous frame, pause, play, next frame, go-to-end.
  - Toggle buttons show or hide a status panel and a codetrace panel. — [VisuAlgo BST](https://visualgo.net/en/bst)
- BST page operations panel:
  - Create: Empty, Examples, Min AVL Tree, Perfectly Balanced, Balanced, Unbalanced, or Random/Skewed Right/Left with a chosen N.
  - Operations: Search(v) (exact or lower_bound), Insert(v), Remove(v), Predecessor/Successor, Select(k), Inorder/Preorder/Postorder traversal.
  - A "Toggle BST Layout" option. — [VisuAlgo BST](https://visualgo.net/en/bst)
- BST keyboard shortcuts: Space plays, pauses or replays; Left/Right step one frame; -/+ change speed; Esc switches between e-Lecture and Exploration mode; PageUp/PageDown move between slides. — [VisuAlgo BST](https://visualgo.net/en/bst)
- BST e-Lecture content on height and skew:
  - height(v) is the number of edges to the deepest leaf, and an empty tree has height -1.
  - The lower bound is h ≥ log2(N+1) - 1, reached by a perfectly balanced tree.
  - Inserting keys in ascending order produces a skewed tree with h = N-1, so O(h) operations degrade to O(N).
  - AVL trees keep h < 2 log2 N. — [VisuAlgo BST](https://visualgo.net/en/bst)
  - This maps directly onto HeatWatch's "height/skew" metric.

**USFCA Data Structure Visualizations, David Galles (https://www.cs.usfca.edu/~galles/visualization/Algorithms.html)**
- The catalogue covers almost exactly the HeatWatch set:
  - Stack and Queue, each as array and as linked list
  - Lists (Java version only)
  - Binary and Linear Search
  - BST, AVL, Red-Black and Splay trees
  - Open Hash Tables (separate chaining), Closed Hash Tables (open addressing), and closed hashing with buckets
  - Comparison sorting, including Merge and Quick
  - BFS, DFS, Connected Components, Dijkstra, Prim, Kruskal, Topological Sort and Floyd-Warshall
  - Disjoint Sets
  - 2D/3D rotation, scale and coordinate-system matrices — [USFCA Algorithms index](https://www.cs.usfca.edu/~galles/visualization/Algorithms.html)
- The index page carries a "Copyright 2011" notice and does not say whether it is maintained. The array-queue page exists ("Queue (Array Implementaion)"), but the fetch returned only its title, not the canvas or controls. — [USFCA Algorithms index](https://www.cs.usfca.edu/~galles/visualization/Algorithms.html); [USFCA QueueArray](https://www.cs.usfca.edu/~galles/visualization/QueueArray.html)

**algorithm-visualizer.org (https://algorithm-visualizer.org/; repo https://github.com/algorithm-visualizer/algorithm-visualizer)**
- Describes itself as an "Interactive Online Platform that Visualizes Algorithms from Code". Tracer libraries in each supported language "extract visualization commands from code", and the web app "interprets commands into visualizations". — [GitHub repo](https://github.com/algorithm-visualizer/algorithm-visualizer)
- The repo is MIT-licensed with about 49.4k stars, 7.6k forks, 668 commits on master, 49 open issues and 32 open PRs. No archive banner was visible. — [GitHub repo](https://github.com/algorithm-visualizer/algorithm-visualizer)
- The tracers.js README example shows:
  - `new Array2DTracer('Grid')` with `set`, `selectRow` and `deselectRow`
  - `new LogTracer('Console')` with `println`
  - Layout composition via `Layout.setRoot(new VerticalLayout([...]))`
  - `Tracer.delay()` to mark animation frames
  - The full API is at https://algorithm-visualizer.github.io/tracers.js — [tracers.js repo](https://github.com/algorithm-visualizer/tracers.js)

**R3F / three.js sorting demos with notable UI features**
- kkuchar2/sorting-visualizer (live demo https://sortingvis.kkucharski.com/):
  - Stack: Next.js and React Three Fiber, rendering "instanced geometry based on the current data state". The sort logic runs in Web Workers with SharedArrayBuffer.
  - Sound: a Web Audio engine plays a tone per accessed or swapped element, with modes Tone, Sine, Chip, Buzz, Pluck, Noise and Off.
  - Code view: syntax-highlighted algorithm source via Starry Night.
  - Visual modes: bars, radial, spiral, heatmap and image sorting.
  - Controls: shuffle, sort, pause, stop and sample count. — [kkuchar2/sorting-visualizer](https://github.com/kkuchar2/sorting-visualizer)
- atoomnetmarc/3D-Sorting-Algorithm-Visualizer (live demo https://atoomnetmarc.github.io/3D-Sorting-Algorithm-Visualizer/):
  - Plain Three.js with Jest tests and 25+ algorithms (incl. Merge, TimSort, Bitonic).
  - Camera rotate, zoom and pan; Start/Pause and Step buttons; a speed slider.
  - A rainbow gradient palette with "sorting indicators and highlighting". The README does not say whether it counts comparisons or swaps. — [atoomnetmarc repo](https://github.com/atoomnetmarc/3d-sorting-algorithm-visualizer)

### Inferences
- **Core interaction contract.** Taken together, VisuAlgo and USFCA set the bar faculty will expect:
  - (a) frame-accurate step back and forward, not just play/pause
  - (b) a speed control
  - (c) user-entered operations (insert or search a value)
  - (d) a code-trace or pseudo-code panel synced to the current frame
  - (e) a status line saying in words what just happened
  - VisuAlgo-style keyboard shortcuts (Space, Left/Right, -/+) are cheap and add polish.
- **Trace model.** The algorithm-visualizer split (code emits commands, the renderer replays them) fits HeatWatch well. The C++ engine can emit a JSON trace of events such as `{op:"probe", bucket:3, node:2}` or `{op:"rotate"...}`. The React page then becomes a pure player over an event array, so step-back is just an index decrement.
- **Narration.** Each trace event should carry a `pseudoLine` id and a human-readable `caption`. That covers code highlighting and narration together.
- **Counters and sound.** Running counters (comparisons, probes, collisions, visited count) and optional sound, as in kkuchar2, are differentiators that 2D tools mostly lack.

### Gaps
- I could not confirm VisuAlgo's exact color semantics (e.g. which color means "currently examined" vs "visited") or the codetrace line-highlighting behavior from page text. The BST page fetch did not describe them, even though the status and codetrace toggles exist. Verify by opening the site.
- I could not confirm USFCA controls (Skip Back / Step Back / Pause / Step Forward / Skip Forward, animation speed slider, canvas size) from fetched text, because the page is canvas/JS-rendered. They are widely known but unverified here.
- I could not confirm the date of the last commit for algorithm-visualizer, so active maintenance in 2026 is unverified.
- I did not research "Algorithm Wiki/visualizers" or d3-specific DS demos in depth.

---

## Q2. Notable 3D DS/algorithm visualizations (three.js, R3F, WebGL, Codrops, GitHub, CodePen)

### Takeaway
Polished 3D data-structure visualizers are rare. Most of the ecosystem is 3D sorting bars plus general-purpose 3D graph rendering (vasturiano's 3d-force-graph). A fully 3D, multi-structure showcase is therefore a real differentiator, but there are few direct templates to copy. The reusable building blocks are 3d-force-graph (graphs and trees), R3F instanced bars (sorting), and Codrops R3F ring/carousel techniques (circular queue).

### Cited Findings
- **3d-force-graph (vasturiano)** — https://github.com/vasturiano/3d-force-graph
  - A "3D force-directed graph component using ThreeJS/WebGL", MIT-licensed, about 6.5k stars.
  - Physics: d3-force-3d (default) or ngraph. React bindings live in the separate react-force-graph project.
  - API: `nodeColor`, `nodeThreeObject` (custom meshes), `linkDirectionalParticles` (particles flowing along edges), `onNodeClick` (with a click-to-focus camera example), and `dagMode` (`td`, `radialout`, etc.) for hierarchical layouts. Examples include text-as-nodes and text-in-links. — [3d-force-graph README](https://github.com/vasturiano/3d-force-graph)
  - Live examples: https://vasturiano.github.io/3d-force-graph/example/basic/ , https://vasturiano.github.io/3d-force-graph/example/large-graph/ , https://vasturiano.github.io/3d-force-graph/example/tree/ (DAG mode) — [3d-force-graph README](https://github.com/vasturiano/3d-force-graph)
- **ShowTree (svtkrp/ShowTree)** — https://github.com/svtkrp/ShowTree
  - Visualizes trees and tree algorithms step by step, using three.js for nodes and 3d-force-graph for building the trees.
  - Covers generic trees, binary heaps, red-black trees and B-trees. Plain BST is not explicitly listed.
  - The description is in Russian, and the repo dates from about 2020. — [search summary of ShowTree](https://github.com/svtkrp/ShowTree)
  - It was the only three.js tree visualizer the search found. No dedicated three.js BST project turned up.
- **vinayak-h/3d-stack-visualization** — https://github.com/vinayak-h/3d-stack-visualization
  - A "real-time 3D visualization tool for various data structures" built with React, Three.js (@react-three/fiber, @react-three/drei) and Vite.
  - Covers stack push/pop, queue enqueue/dequeue, and linked-list and tree add/delete, with animations. This is the closest stack match to HeatWatch (React + Vite + R3F). — [repo via search](https://github.com/vinayak-h/3d-stack-visualization)
- **kkuchar2/sorting-visualizer** (R3F, instanced geometry, worker-driven, sound, bars/radial/spiral/heatmap modes) — https://github.com/kkuchar2/sorting-visualizer ; demo https://sortingvis.kkucharski.com/ — [repo](https://github.com/kkuchar2/sorting-visualizer)
- **atoomnetmarc/3D-Sorting-Algorithm-Visualizer** (Three.js, 25+ algorithms, orbit camera, step/pause/speed) — https://github.com/atoomnetmarc/3d-sorting-algorithm-visualizer ; demo https://atoomnetmarc.github.io/3D-Sorting-Algorithm-Visualizer/ — [repo](https://github.com/atoomnetmarc/3d-sorting-algorithm-visualizer)
- **Other 3D sorting repos found by search:**
  - ShenTengTu/Sort3DVisualization (Three.js; exchange, selection, insertion, merge, quick, bubble, cocktail, radix) — https://github.com/ShenTengTu/Sort3DVisualization
  - alexmatros/sorting-visualizer-3d — https://github.com/alexmatros/sorting-visualizer-3d
  - [search results](https://github.com/ShenTengTu/Sort3DVisualization)
- **Codrops R3F techniques usable as visual polish:**
  - "Building a WebGL Carousel with React Three Fiber and GSAP" (2023) covers textured planes, a zoom effect, scroll/drag control and post-processing. — [Codrops 2023](https://tympanus.net/codrops/2023/04/27/building-a-webgl-carousel-with-react-three-fiber-and-gsap/)
  - "Exploring a 3D Text Distortion Effect With React Three Fiber" (May 2024) lays characters around a cylindrical ring using drei `Text` and `useFrame` rotation, with a `Ring` component that takes radius, height and segments props. — [Codrops 2024](https://tympanus.net/codrops/2024/05/08/exploring-a-3d-text-distortion-effect-with-react-three-fiber/)
  - Together they give a direct template for a circular-queue ring.
- **R3F core and ecosystem:** pmndrs/react-three-fiber ("a React renderer for threejs", `npm install three @react-three/fiber`) — https://github.com/pmndrs/react-three-fiber ; docs https://r3f.docs.pmnd.rs/ ; curated links at https://github.com/gsimone/awesome-react-three-fiber — [search results](https://github.com/pmndrs/react-three-fiber)

### Inferences
- **Graph (BFS/DFS) and BST.** 3d-force-graph / react-force-graph-3d is the fastest route to a convincing 3D graph:
  - `linkDirectionalParticles` can animate the BFS/DFS frontier along edges.
  - `nodeColor` can encode unvisited, frontier, visited and component id.
  - `dagMode:'td'` gives a quick 3D layered BST.
  - For a BST, a custom deterministic layout (x from in-order index, y from depth) in plain R3F is more legible than force layout, because force layouts jitter and do not preserve left/right order.
- **Sorting.** The bar/instanced-mesh approach (kkuchar2) is the proven pattern for merge sort in R3F.
- **Polish.** Codrops-style post-processing (bloom, depth of field) and GSAP easing add Awwwards-level finish but should stay secondary to legibility.

### Gaps
- I found no specific three.js/R3F visualizations of a hash table with chaining, a circular queue/ring buffer, or infix-to-postfix stacks. These would have to be designed from scratch.
- I did not survey Awwwards/CSSDA or CodePen specifically, so I found no award-listed DS visualizers.
- Activity, licence and star counts for vinayak-h, ShowTree, ShenTengTu and alexmatros were not verified.
- 3d-force-graph's last release date was not confirmed. vasturiano's react-force-graph (https://github.com/vasturiano/react-force-graph) is referenced by the README but was not fetched.

---

## Q3. Legible 3D metaphors for each of the 7 structures, and the pitfalls of 3D

### Takeaway
Visualization theory warns against "unjustified 3D" for abstract data. Depth is a weak channel, occlusion hides marks, and perspective distorts size encodings. The 3D page should therefore use depth sparingly and for a reason (separating layers, giving a ring its shape, staging focus), and keep the key encodings (order, value, pointer) on the screen plane. Labels should always face the camera, and a reset view or a 2D "flat" toggle should be provided.

### Cited Findings (pitfalls)
- **Planar position beats depth.** Munzner ranks planar spatial position as the strongest channel, and depth is not part of it.
- **Occlusion.** Hidden marks can conceal important details, and recovering them through interaction costs time and cognitive load.
- **Perspective distortion.** It interferes with all size encodings. — [Munzner, VAD rules of thumb slides](https://www.cs.ubc.ca/~tmm/courses/436V-20/slides/rulesofthumb.pdf); [Munzner minicourse slides](https://www.cs.ubc.ca/~tmm/talks/minicourse14/minicourse14-session4.pdf)
- **3D bar charts.** Munzner calls them "very hard to justify" and says faceting into 2D is almost always better. 3D is legitimate for true 3D spatial data, while abstract data needs much more careful justification, and interactive navigation helps when 3D is used. — [Munzner rules of thumb](https://www.cs.ubc.ca/~tmm/courses/436V-20/slides/rulesofthumb.pdf); [VAD-rules talk](https://cs.ubc.ca/~tmm/talks/vad/VAD-rules.pdf)
- **Congruence and Apprehension.** Animated graphics must satisfy both principles: the structure must match the concept, and the motion must be perceivable and comprehensible. Animation often fails Apprehension because it is too fast or complex. Interactivity, letting learners pause, replay and control pace, is suggested as a remedy. — [Tversky, Morrison & Betrancourt 2002, IJHCS 57(4):247-262](https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf)
- **Reference cases (BST).** VisuAlgo's own BST view includes a "Toggle BST Layout" option and Skewed Left/Right generators. Skew is a first-class teaching point. — [VisuAlgo BST](https://visualgo.net/en/bst)
- **Reference cases (sorting).** Real 3D sorting demos fall back on orbit camera controls (rotate, zoom, pan) to cope with depth, which is evidence of the navigation cost. — [atoomnetmarc repo](https://github.com/atoomnetmarc/3d-sorting-algorithm-visualizer)
- **Reference cases (variants).** kkuchar2 offers radial, spiral and heatmap variants alongside plain bars. — [kkuchar2 repo](https://github.com/kkuchar2/sorting-visualizer)

### Inferences: proposed 3D metaphors (design proposals, not sourced facts)
1. **Circular queue (fixed array, front/rear/count, wraparound, overflow rejection)**
   - **Shape:** a flat ring or carousel of N slot "pads" lying on the ground plane, seen from a 30-45 degree elevated camera. Slot index labels sit on the outer rim.
   - **Pointers:** front and rear are tall colored pylons or arrows hovering over their slots, in two distinct hues.
   - **Data:** each occupied slot holds a block whose color comes from the heat value, which ties the page to the HeatWatch theme.
   - **Wraparound:** the rear pylon moves along the arc from slot N-1 to slot 0. The circular motion itself teaches modulo arithmetic, which satisfies Congruence.
   - **Overflow:** an incoming block bounces off the ring, the ring flashes red, and a "REJECTED: count == capacity" caption appears.
   - **Counters:** count/capacity is shown as an arc gauge in the ring's center.
   - **Why it works:** this is the strongest justified 3D case, because the ring shape is the concept. The Codrops cylinder-ring technique is the template.
2. **Singly linked list (head/tail, append, remove-oldest)**
   - **Shape:** a horizontal "train" of node capsules along the x-axis. Each capsule has two compartments: data and next.
   - **Links:** next-pointers are arrow tubes or curves, with a small particle flowing along each link to show direction.
   - **Pointers:** head and tail are floating labelled markers.
   - **Append:** a new node drops in from above and its link tube "grows".
   - **Remove-oldest:** the head node lifts away and fades, then the head marker slides one step.
   - **Depth:** keep the list in one plane, using depth only for drop and lift motions, to avoid occlusion.
3. **BST (insert, search path, range query, delete, height/skew)**
   - **Shape:** x is the in-order rank and y is the depth going downward. The z-axis is used little, either for a slight parallax tilt or to push non-path nodes back.
   - **Search path:** path nodes light up in sequence, and a glowing token travels down the edges. Each comparison shows "42 < 57 → go left" as a caption.
   - **Range query:** a translucent vertical slab spans [lo, hi] on the in-order x-axis. Nodes inside it glow, and pruned subtrees dim.
   - **Height/skew:** a depth ruler sits on the side, alongside a live "height h vs ⌈log2(N+1)⌉-1 optimal" gauge, following VisuAlgo's framing. A skewed tree visibly becomes a long diagonal staircase.
   - **Delete:** colors the case (leaf, one child, two children), animates the successor moving up, and highlights the in-order successor.
4. **Hash table with separate chaining (buckets, collisions, load factor, resize)**
   - **Shape:** a row (or ring) of bucket "wells" or pads along x, with chain nodes stacked vertically in each bucket like a column of discs. Chain length becomes literal height, and long columns read instantly as collisions.
   - **Insert:** the key flies from a "hash(k) mod m" label to its bucket. On a collision, the bucket flashes and the node stacks on top.
   - **Load factor:** a gauge λ = n/m with a threshold line.
   - **Resize:** the table animates from m to 2m buckets, and each node re-hashes and flies to its new column. This is a memorable moment in the demo.
   - **Camera:** a slightly elevated front view avoids columns hiding each other.
5. **Undirected graph + BFS/DFS (visited set, order, connected components)**
   - **Layout:** 3D force layout (3d-force-graph or a custom layout) with fixed positions once settled.
   - **Node colors:** unvisited grey, frontier/queue amber, current white-hot, visited by component color.
   - **Edges:** BFS tree edges thicken and particles run along the discovery edges.
   - **Side panel:** the BFS queue (or DFS stack) as a 2D strip, plus a visited-order list (1, 2, 3...).
   - **Components:** the graph separates into islands colored per component id.
   - **Legibility:** a 2D/flat fallback or a constrained layout (z near 0) helps, because 3D force graphs suffer occlusion.
6. **Merge sort + binary search (comparisons, interval narrowing)**
   - **Merge sort:** a bar "terrain" (instanced meshes, as in kkuchar2). Recursion depth goes on z, with each recursion level as a row moving away from the camera, so the split/merge tree is visible. The merged array rises back to the front row.
   - **Comparisons:** the two compared bars glow, and a comparisons counter increments.
   - **Binary search:** the sorted bars, with lo/mid/hi as three floating markers. Bars outside [lo, hi] sink and fade at each step, showing the interval halving, and a "step k of ⌈log2 n⌉" counter runs.
   - **Values:** bar heights should be read from a 2D-facing angle, since perspective distorts heights (Munzner).
7. **Stack (infix-to-postfix operator stack and value stack)**
   - **Shape:** two vertical tubes or "Pringles cans" side by side, labeled operator stack and value stack.
   - **Motion:** tokens drop in for push and pop out for pop.
   - **Expression tape:** the infix expression runs along the bottom with a read cursor, and the postfix output tape builds on the right.
   - **Precedence:** a comparison triggers a "pop while prec(top) ≥ prec(token)" caption.
   - **Evaluation:** in the value-stack phase, two values pop, merge into an operator "reaction", and the result pushes back.
- **Cross-cutting legibility rules (inferred from Munzner and Tversky):**
  - Use camera-facing (billboarded) text, e.g. drei `Text`/`Billboard`/`Html`.
  - Use an orthographic or narrow-FOV camera for structures where size or position comparison matters (sort bars, BST layout).
  - Make "Reset view" and keyboard-snapped preset cameras the default rather than free orbit.
  - Keep a consistent color legend across all seven panels (same hue for "active/current", "visited/done", "rejected/error").
  - Make the key quantities explicit in a 2D HUD overlay rather than encoding them only in 3D.
  - Respect `prefers-reduced-motion`.

### Gaps
- I found no empirical study comparing 3D and 2D for teaching these specific data structures. The 3D pitfalls above come from general visualization theory (Munzner) and animation research (Tversky), not DS-specific experiments.
- The specific drei components (`Text`, `Billboard`, `Html`, `OrthographicCamera`) were not fetched or verified in this session, apart from `Text` in the Codrops ring tutorial.

---

## Q4. What does education / HCI research say about algorithm animation effectiveness?

### Takeaway
The consistent finding is that how learners interact with an algorithm visualization matters more than how good it looks. Active engagement (predicting, answering questions, changing inputs, building) produces learning, and passive viewing often does not. For HeatWatch this means the 3D page should include predict-the-next-step prompts, user-chosen inputs and learner-controlled pacing. Production value alone is not enough.

### Cited Findings
- **Hundhausen, Douglas & Stasko (2002), "A Meta-Study of Algorithm Visualization Effectiveness"**, *J. Visual Languages & Computing* 13(3):259-290, DOI 10.1006/JVLC.2002.0237.
  - Reviewed 24 controlled experimental studies of AV in classroom-type settings. — [dblp record](https://dblp1.uni-trier.de/rec/bibtex/journals/vlc/HundhausenDS02); [academia.edu copy](https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness)
  - Abstract-level finding: "how students use AV technology has a greater impact on effectiveness than what AV technology shows them". AV is effective when used to actively engage students. — [typeset summary](https://typeset.io/papers/a-meta-study-of-algorithm-visualization-effectiveness-2rfogtzhbq); [Diehl SoftVis education slides](https://www.rw.cdl.uni-saarland.de/people/diehl/private/SoftVisVorles/slides/07_SV_EducationEvaluation.pdf)
  - More than 40% of the 24 studies found no significant result, according to a secondary review (not verified against the full text). — [search-result summaries, e.g. GNN101 arXiv](https://arxiv.org/pdf/2411.17849)
  - Cognitive Constructivism had the best predictive success among the learning theories considered. — [Bohrium summary](https://www.bohrium.com/paper-details/a-meta-study-of-algorithm-visualization-effectiveness/812454576836837378-12577)
- **Naps et al. (ITiCSE 2002 Working Group), "Exploring the role of visualization and engagement in computer science education"**, SIGCSE Bulletin 35(2):131-152 (proceedings 2002, journal 2003).
  - Defines the six-level Engagement Taxonomy: No viewing, Viewing, Responding (answering questions about the visualization), Changing (modifying input or the simulation), Constructing (building one's own visualization) and Presenting (explaining a visualization to others for feedback).
  - Its hypothesis is that learning improves as engagement level rises. — [CiNii record](https://cir.nii.ac.jp/crid/1360574096426136704?lang=en); [Warwick PVW04 paper](https://www.dcs.warwick.ac.uk/pvw04/p16.pdf); [typeset PDF](https://typeset.io/pdf/exploring-the-role-of-visualization-and-engagement-in-bhelf2687d.pdf)
  - Later work extends it: Myller et al. proposed a 10-level Extended Engagement Taxonomy, and Sorva et al. a two-dimensional revision. — [search summaries citing these](https://link.springer.com/article/10.1186/s41039-015-0014-0)
- **Byrne, Catrambone & Stasko (1999), "Evaluating animations as student aids in learning computer algorithms"**, *Computers & Education* 33(4):253-278.
  - Two experiments, on DFS and binomial heaps.
  - Asking learners to predict the algorithm's next step drove procedural learning. Learners who predicted from static diagrams benefited too, so "prediction, rather than animation per se" may be the key factor.
  - A benefit of animation beyond prediction was not supported. — [Full text PDF (UW)](https://courses.cs.washington.edu/courses/cse591e/02sp/readings/evaluating_animations.pdf)
- **Tversky, Morrison & Betrancourt (2002), "Animation: can it facilitate?"**, IJHCS 57(4):247-262.
  - Many studies that showed animation beating static graphics were confounded.
  - Animation must satisfy the Congruence and Apprehension principles.
  - Animation is promising for showing real-time change and reorientation.
  - Judicious interactivity (control of pace, replay) may overcome its disadvantages. — [Stanford copy](https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf); [UW copy](https://faculty.washington.edu/aragon/classes/hcde411/w13/readings/Tversky_AnimationFacilitate_IJHCS02.pdf)
- **Shaffer et al. (2010), "Algorithm Visualization: The State of the Field"**, ACM TOCE 10(3), Art. 9, DOI 10.1145/1821996.1821997.
  - Analyzed 500+ AVs catalogued in the AlgoViz wiki.
  - Coverage is skewed toward simple topics such as sorting, quality varies widely with many low-quality AVs, and dissemination is poor. — [VT author copy](https://people.cs.vt.edu/~shaffer/Papers/ShafferTOCE11); [VTechWorks](https://vtechworks.lib.vt.edu/items/08086c4d-11e4-4495-b1d7-0330f9e2c979/full)
  - The 500+ figure came from abstract and mirror text and should be checked against the DOI.

### Inferences (design implications for HeatWatch)
- **Responding level:**
  - Before key steps, pause and ask, e.g. "Which bucket will key 'Pune-17' land in?", "Will this enqueue be rejected?", "Which node does BFS visit next?", "Is the next comparison left or right?".
  - Reveal the answer and keep a score.
  - This applies Byrne et al.'s prediction effect directly, and it is cheap to build because the engine trace already knows the answer.
- **Changing level:**
  - Let the user type values to insert, search or delete.
  - Let them adjust queue capacity, hash table size, resize threshold and graph edges.
  - Let them switch between real HeatWatch engine data and custom input, as VisuAlgo does.
- **Learner control:** step back and forward, scrub timeline, speed slider, pause on every caption. This answers Tversky's Apprehension principle.
- **Explanation layer:** synced pseudo-code highlighting, a narration caption per step, and live counters (comparisons, probes, collisions, visited, height). These connect the visual to the algorithmic concept and satisfy Congruence.
- **Presenting level:** an "export this run" or shareable trace link, plus a "presenter mode" for the viva or demo.
- **Framing for faculty:** grading is heavy on frontend, but the research says interactivity and engagement matter more than visual sophistication. The 3D polish should carry real pedagogical features. Citing Hundhausen 2002 and Naps 2002 in the project report would strengthen the design rationale.

### Gaps
- I could not access the full text of Hundhausen et al. 2002 (academia.edu returned 403), so the per-study breakdown and exact quotations are from abstracts and secondary sources.
- I did not locate empirical studies specifically on 3D or VR algorithm visualization effectiveness, so there is no evidence here either for or against 3D for learning DS.
- The newer extended engagement taxonomies (Myller et al. 2009; Sorva et al. 2013) were not fetched directly.
