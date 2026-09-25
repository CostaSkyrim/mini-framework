# Guide: how mini-framework works, and why

This document explains the *reasoning* behind the framework's design. For
hands-on API reference, see the other files in this folder.

> **A note on import paths.** Code samples in `docs/` import from `../src/...`,
> assuming your app file sits beside the `docs/` folder (i.e. at the project
> root). When you copy an example into your own file, change the path to point
> at the framework wherever it lives relative to *your* file — e.g. the bundled
> `examples/todoMVC/app.js` uses `../../src/index.js`.

---

## Inversion of control

A framework is different from a library. With a library you call functions when
you feel like it. With a framework **you hand it the description of your app,
and it drives**. In mini-framework that description takes two forms:

1. **A vnode tree** — a plain object describing the DOM you want (`h()` output).
2. **A reducer** — a function describing how state changes (`(state, action)`).

The framework owns the render loop, the diffing, the event wiring, and the
routing. Your code is only ever *called by* the framework: reducers are invoked
on dispatch, event handlers are invoked on user input, and views are re-invoked
on every state change.

---

## Why a virtual DOM?

The DOM can be viewed as one large object. The spec example

```html
<div class="nameSubm">
  <input type="text" placeholder="Insert Name" />
</div>
```

is equivalent to

```js
{
  tag: "div",
  attrs: { class: "nameSubm" },
  children: [
    { tag: "input", attrs: { type: "text", placeholder: "Insert Name" } },
  ],
}
```

Manipulating the real DOM directly is error-prone and verbose. Three common
alternatives exist:

| Approach | Idea | Trade-off |
|----------|------|-----------|
| Data binding | Keep two data sources synchronized | Couples data and view; hard to undo/rollback |
| Templating | Bind templates client-side | String-based; weak composition/type safety |
| **Virtual DOM** | Diff two trees, patch only what changed | A little upfront machinery, pays off in predictability |

mini-framework uses a **virtual DOM** because it gives:

- **Predictability** — render is a pure function of state (`view(state)`).
- **Minimal work** — only changed nodes are touched, no imperative churn.
- **Future-proofing** — a 60 fps game loop re-renders every frame; keyed diffing
  makes that cheap and stable (see `plan.md`).

The vnode shape is the spec's `{ tag, attrs, children }` plus two reserved keys:

```js
{
  tag: "button",
  props: { class: "btn" },     // attributes (note: "class" not "className")
  events: { click: fn },       // event handlers
  hooks: { onMount: fn },      // lifecycle
  children: [ ... ],
}
```

---

## Why a reducer-based store?

State is "the outcome of all actions the user has taken since the page loaded."
The requirement is that **multiple pages can reach the same state**. A single
observable store is the one place every view reads from, so nothing drifts out
of sync.

State changes go through a pure reducer:

```js
state = reducer(state, action);
```

Pure reducers are:

- **Predictable** — a given action always produces the same next state.
- **Serializable** — the store is a snapshot factory, which is exactly what
  netcode (frame sync / rollback) needs later.
- **Testable** — no side effects to mock.

---

## Why a custom event system?

The spec requires a way to handle events that is *different from*
`addEventListener()`. mini-framework provides `on()`, `delegate()`, and a global
`emit()`/`subscribe()` bus.

A dedicated layer buys two things:

1. **Lifecycle control** — the renderer attaches/removes listeners through one
   registry as nodes mount/patch/unmount, so re-renders never leak or duplicate
   handlers.
2. **An input abstraction** — later, keyboard/controller events are normalized
   here into named game actions (`move:left`, `bomb:place`). Netcode can replay
   those same events without touching the DOM at all.

---

## Why routing is "URL ⇄ state"

Routing synchronizes the app state with the URL. Clicking a filter link in
todoMVC changes the hash to `#/active`; the router notifies the app, which
re-reads state and re-renders. The reverse is also true: pasting a URL deep
links straight into the matching view.

The router uses the History API and falls back to hash routing automatically,
so it works from `file://` and simple static servers alike.
