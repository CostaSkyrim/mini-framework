# Mini-Framework: Design Plan

## 1. Core Philosophy

A framework **inverts control** — we call the developer's code. To keep this sustainable into the Bomberman project, the design separates into **two layers**:

| Layer | Concern |
|-------|---------|
| **Core (present)** | DOM abstraction, routing, state, events — pure JS, no game logic |
| **Runtime (future)** | Engine loop, input, netcode, sprites, scenes — built *on top of* the core |

The core must stay **generic and decoupled** so Bomberman's `Movement`, `Bomb`, `Cutscene`, `Sound`, `Music` classes plug in without modifying the framework.

---

## 2. Architecture

```
mini-framework/
├── README.md                    # quickstart + philosophy
├── docs/                        # full framework documentation
│   ├── guide.md
│   ├── routing.md
│   ├── state.md
│   └── events.md
├── src/                         # framework source (ES modules)
│   ├── index.js                 # public API surface
│   ├── core/
│   │   ├── vdom.js              # virtual DOM + diff/patch
│   │   ├── h.js                 # element factory
│   │   └── renderer.js          # reconcile + mount
│   ├── state/
│   │   └── store.js             # observable store + subscriptions
│   ├── routing/
│   │   └── router.js            # history API + hash fallback
│   ├── events/
│   │   └── emitter.js           # custom event system (delegation)
│   └── lifecycle/
│       └── hooks.js             # onMount / onUpdate / tick
└── examples/
    └── todoMVC/                 # the deliverable app
        ├── index.html
        ├── app.js
        └── styles.css
```

---

## 3. Feature Decisions

### DOM Abstraction — Virtual DOM + diff/patch
- **Why over data-binding/templating:** gives fine-grained, synchronization-independent updates, which is exactly what a 60fps game needs later (only re-render changed nodes, not imperative DOM churn).
- Node shape follows the spec's `{ tag, attrs, children }` with added `events` and `key` (for list reconciliation).
- Diffing is **keyed**, so Bomberman sprite swaps and power-up list mutations are cheap.

### State Management — Observable store (single source of truth)
- A central `createStore(reducer)` with `getState`, `dispatch`, `subscribe`.
- Separate stores allowed (e.g., `gameState`, `uiState`) to avoid coupling netcode state from rendering state.
- **Future-proofing:** the store is tick-agnostic, so the Bomberman netcode layer can dispatch authoritative server snapshots into it.

### Routing — URL ⇄ state synchronization
- Uses `history.pushState` with a hash fallback.
- Routes map paths to render functions that read from the store.
- TodoMVC uses `/` (all), `/#/active`, `/#/completed`.

### Event Handling — Delegated custom events (not `addEventListener`)
- A central **event emitter + delegation** system: events are declared in the vnode (`events: { click: handler }`) and handled via a single root listener.
- Exposes `on(target, type, handler)` — a syntax distinct from `addEventListener`.
- **Future-proofing (critical for Bomberman):** this same emitter drives a **global input bus** — keyboard/controller events get normalized into named events (`move:left`, `bomb:place`), which the game classes subscribe to. Frame-synced input buffering later wraps this cleanly.

---

## 4. Future-Proofing Bridge (for Bomberman)

The core already anticipates the game by exposing:

1. **A game loop hook** (`lifecycle / tick`) — vdom re-render is itself a per-frame concern; Bomberman gets an `update(deltaTime)` that runs before each render.
2. **Input abstraction** — the event emitter becomes the input layer (`on('keydown:ArrowLeft', ...)`), decoupled from DOM listeners, ready for netcode replay.
3. **Keyed VDOM** — supports sprite **frame cycling** (swap `src` per tick) and entity lists efficiently.
4. **State replay** — the observable store is snapshot-friendly, a prerequisite for **frame syncing / rollback netcode** over websockets.
5. **Module boundaries** — each game aspect (`Bomb`, `Movement`, `Music`) is a plain class consuming `store`, `on`, and `h`; no framework changes required.

---

## 5. Build Order

1. **`h()` + vdom node model** → render static DOM
2. **Reconciliation** (mount, keyed diff, patch, unmount)
3. **Event emitter** (+ delegation into renderer)
4. **Store** (dispatch/reduce/subscribe, re-render on change)
5. **Router** (URL sync)
6. **todoMVC** using only the framework
7. **Docs** (README + docs/)

---

## 6. Tooling Decisions

- **Plain ES modules**, no build step, for maximum "clone-and-run" simplicity.
- Serve any directory with a static server (e.g., `python -m http.server`) — no bundler, no compile step.
- Language: **plain JS** (spec explicitly says "pure JS" for the game).
