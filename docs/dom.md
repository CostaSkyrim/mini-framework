# DOM abstraction

Everything about building UI in mini-framework starts with `h()`, the element
factory. It returns a **vnode** (virtual node), a plain object. The framework
turns vnodes into real DOM, and later diffs new vnodes against old ones to
update only what changed.

---

## Creating an element

```js
import { h } from "../src/core/h.js";

const title = h("h1", { class: "title" }, "Hello world");
```

`h(tag, props, ...children)` takes:

1. **tag** — the element name (e.g. `"div"`).
2. **props** — attributes, events, and lifecycle hooks (all optional).
3. **children** — child vnodes, strings, numbers, or arrays (nesting is allowed).

Strings and numbers are automatically converted to text nodes; `null`,
`undefined`, and `false` are discarded.

```js
h("div", {}, "text", 42, null, h("span", {}, "nested"));
// renders: <div>text42<span>nested</span></div>
```

---

## Adding attributes

Pass attributes as the second argument:

```js
h("input", {
  type: "text",
  placeholder: "Insert Name",
  "data-count": 5,
});
```

Notes:

- Use **`class`**, not `className` — the framework maps it for you.
- Boolean attributes (`checked`, `disabled`, `autofocus`) are handled by their
  property on the element.
- Removing an attribute: pass `null`, `undefined`, or `false`, and it is removed
  from the DOM on the next render.

---

## Nesting elements

Children can be nested arbitrarily, and can be arrays (the framework flattens
them), so you can build trees directly from data with `.map()`:

```js
h("ul", {},
  items.map((item) =>
    h("li", { key: item.id }, item.label),
  ),
);
```

---

## Lists and keys

When rendering a list, give each item a stable **`key`**:

```js
h("li", { key: todo.id }, todo.title);
```

Keys let the differ match elements by identity instead of position, so
reordering, inserting, and removing items touches the **minimum** number of DOM
nodes. This is mandatory-friendly best practice and, later, keeps a per-frame
game loop cheap.

**The contract, precisely:**

- Siblings with a `key` are diffed **by key**. Reorder/insert/remove preserves
  node identity (focus, caret, input value, handler closures stay put).
- Siblings without a `key` are diffed **by position**. Inserting or removing in
  the middle of an unkeyed list therefore *shifts node identity* — the rendered
  output stays correct, but a focused input or reused node can jump.
- Either all siblings should be keyed or all left unkeyed. **Mixing** them, or
  using **duplicate** keys, triggers a one-time developer warning
  (`console.warn`, prefixed `[mini-framework]`). Warnings are silenced when
  `globalThis.__MINI_DEV__ === false`.

---

## Lifecycle hooks

Add any of these to `props`:

```js
h("div", {
  onMount:   (el) => {},       // after the element is in the DOM
  onUpdate:  (el, prev) => {}, // after an in-place update
  onUnmount: (el) => {},       // just before removal
});
```

Hooks are never written to the DOM as attributes.

When a subtree is removed — a node removed from a list, or a node replaced
because its `tag` changed — `onUnmount` fires for **every node in that subtree,
children before parents** (post-order). Use it to release anything a subtree
owns (timers, subscriptions, attention).

---

## Rendering

There are two APIs:

- **Manual** (`mount` / `patch`) — for full control, from `core/vdom.js`.
- **Renderer factory** (`createRenderer`) — the recommended app-level API:

```js
import { createRenderer } from "../src/index.js";

const container = document.getElementById("app");
const { render } = createRenderer(container);

render(h("p", {}, "first render"));
render(h("p", {}, "second render")); // diffs, patches in place
```

The first `render()` mounts a fresh tree; every later call patches against the
previous one.

---

## Full example

```js
import { h, createRenderer } from "../src/index.js";

const { render } = createRenderer(document.getElementById("app"));

render(
  h("div", { class: "nameSubm" },
    h("input", { type: "text", placeholder: "Insert Name" }),
    h("input", { type: "submit", placeholder: "Submit" }),
  ),
);
```
