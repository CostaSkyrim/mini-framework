# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

A tiny, dependency-free front-end framework written in pure JavaScript (ES
modules). No build step, no bundler, no transpiler. It provides four pillars:

| Pillar | Location |
|--------|----------|
| DOM abstraction (vdom + diff) | `src/core/h.js`, `src/core/vdom.js`, `src/core/renderer.js` |
| Event handling | `src/events/emitter.js` |
| State management | `src/state/store.js` |
| Routing | `src/routing/router.js` |
| Lifecycle + game loop | `src/lifecycle/hooks.js` |

`src/index.js` is the single public API surface — every framework primitive is
re-exported from there. Apps should import from `src/index.js`, never from the
internal module files directly.

`examples/todoMVC/` is the reference application built entirely on the
framework. `docs/` holds the human-facing API reference; `plan.md` documents the
design intent (the core is meant to grow into a "Bomberman" game engine).

## Commands

- **Run tests:** `npm test` (runs `node --test test/`)
- **Serve the example app:** `npm start` (runs `python3 -m http.server 8000`), then open `http://localhost:8000/examples/todoMVC/`
- **Install dependencies:** `npm install` — only needed for tests; `jsdom` is the sole dev dependency. The framework itself has zero runtime dependencies.

There is no build, lint, or typecheck step. There is no CI configuration.

## Module system gotcha

`package.json` sets `"type": "module"`, so **all** source, test, and example
files are ES modules and must use `import`/`export`. File extensions matter:
imports include the `.js` extension (e.g. `import { h } from "../../src/core/h.js"`).
There is no CommonJS anywhere, no bundler to resolve extension-less imports, and
no path aliases.

Test files use `.mjs` and relative imports resolved from the file's own
location.

## Architecture and data flow

The framework inverts control: user code **describes** the UI (as a vnode tree
via `h()`) and state changes (as a pure reducer); the framework drives render,
diff, event wiring, and routing.

Control/data flow for a typical app (see `examples/todoMVC/app.js` as the
canonical wiring):

1. `createRenderer(container)` returns a bound `render` function.
2. `createStore(reducer, initialState)` creates state; `store.subscribe(draw)`
   re-renders on every state change.
3. `onRouteChange(draw)` and `useRouter(routes)` re-render on URL changes.
4. `draw()` reads `store.getState()`, builds a vnode tree with `h()`, and calls
   `render(vnode)`. First render mounts; subsequent renders diff/patch in place.

The render is always a pure function of state (`view(state)`).

## Key conventions and gotchas

**vnode shape.** A vnode is `{ tag, props, events, hooks, children }`. `h()`
splits the second argument into three buckets: anything named `events`,
`onMount`, `onUpdate`, or `onUnmount` is extracted; everything else becomes
`props` (DOM attributes).

- **`class`, not `className`** — `setAttribute` maps `className`, and docs/tests
  use `class` as the prop key.
- **`events` holds handlers, not the DOM.** Use `{ events: { click: fn } }`,
  never pass `onclick` as a prop.
- Lifecycle hooks are stored in `props` (`onMount`, `onUpdate`, `onUnmount`) and
  are never written to the DOM as attributes. `hooks.js` defines `extractHooks`/
  `stripHooks` but note: `h.js` does the extraction itself, and `renderer`/`vdom`
  read hooks from `vnode.hooks`.

**Text vs element nodes.** Text nodes use the sentinel tag `"#text"` (created by
`h()` from strings/numbers, or via `text()`). `null`/`undefined`/`false` children
are discarded. Children are flattened with `.flat(Infinity)`, so `h("div", {}, arr)`
and `h("div", {}, ...arr)` behave identically.

**Keyed reconciliation.** Give list items a stable `key` (e.g. `key: todo.id`).
Children without keys receive implicit index keys (`__index__N`) internally, so
the diff always runs through a single keyed path.

**Renderer singletons.** `render()` (no args) renders onto `document.body`
via a module-level `defaultRenderer` created at import time. It captures
`document.body` once, so in non-browser contexts (tests) always use
`createRenderer(container)` instead of the bare `render()` export.

**Attribute setting is heuristic.** `setAttribute` sets properties directly for
known element props, special-cases `className` -> `class`, and skips `list` and
`style` (which require `setAttribute`). Setting a prop to `null`/`undefined`/
`false` removes it.

**Event listeners.** vnode `events` are attached eagerly per element via a
`WeakMap` registry (`listenerRegistry` in `vdom.js`), NOT via the public emitter
delegation. The public `on()`/`delegate()` helpers are the app-facing API and are
separate from how the renderer wires `events`. Handlers are replaced (old
removed, new added) when patched.

**State immutability contract.** Reducers must return a new object, or the same
reference to signal "no change" (which suppresses notifications).
`combineReducers` namespaces slices by key but does **not** dispatch like Redux —
each slice reducer receives the same action; the `"set:"` action convention
mentioned in the doc comment is not actually enforced anywhere.

**Router is global/singleton-state.** `useRouter`, `navigate`, `onRouteChange`,
and `getCurrentRoute` all operate on module-level variables (`routes`,
`currentPath`, `onChangeCallback`). There is a single router per app; it uses
History API (`pushState`) and falls back to hash routing. `useRouter` ignores
the `view` property on route objects — the view function is never called by the
router; change notification is via `onRouteChange` alone.

## Testing

Tests use Node's built-in test runner (`node --test`). Two styles coexist:

- `test/vdom.test.mjs` — unit-ish tests of `mount`/`patch`, using a custom
  `assert`/`failures` pattern (not `node:assert`) and `setupDom()` from
  `test/helpers.mjs` to install a jsdom window onto `globalThis`.
- `test/todomvc.test.mjs` — full integration test that loads the real
  `examples/todoMVC/index.html` into jsdom and drives the app through simulated
  DOM events (`form.dispatchEvent`, `input.dispatchEvent`), asserting against
  the live DOM after short `setTimeout` delays.

Gotchas for tests:

- Both test files copy jsdom's window globals onto `globalThis` because the
  framework references bare globals (`document`, `window`, `history`,
  `performance`, `requestAnimationFrame`).
- `todomvc.test.mjs` uses `await import("../examples/todoMVC/app.js")`, which
  runs `useRouter()` and `draw()` at import time; it then awaits a `setTimeout`
  to let `queueMicrotask`ed `onMount` hooks and render settle before asserting.
- The tests are effectively custom scripts that `process.exit(0|1)`; they are
  not written with `describe`/`it` or `node:test` reporting, despite running
  under `node --test`.

## Style and conventions

- Plain JS, 2-space indentation, trailing commas, double-quoted strings.
- Every file opens with a `// filename.js — purpose` header comment explaining
  the *why*, and functions carry JSDoc block comments.
- Reducer actions are string constants exposed on an `actions` object (see
  `examples/todoMVC/store.js`).
- Keep the core generic and decoupled — no game/DOM-app specific logic in
  `src/` (this is a stated goal in `plan.md` for a future game engine).
