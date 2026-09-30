# mini-framework

A tiny, dependency-free front-end framework written in pure JavaScript (ES
modules). It provides the four pillars a framework must offer — **DOM
abstraction, routing, state management, and event handling** — while staying
small enough to read and reason about, and generic enough to grow into a game
engine later (see [`plan.md`](./plan.md)).

> A framework is different from a library: **you call a library, but a
> framework calls you.** With mini-framework, you describe *what* your UI looks
> like and *how* state changes; the framework is in charge of rendering,
> diffing, routing, and notifying.

---

## Quick start

The app needs **no installation and no build step** — it runs as native ES
modules straight in the browser.

```bash
# from the project root:
npm start          # serves the examples at http://localhost:8000
```

Open `http://localhost:8000/examples/todoMVC/` to see the bundled example.

*(`npm install` is only needed if you want to run the automated tests, see
[Running the tests](#running-the-tests).)*

### Your own app in three lines

1. Create an `index.html`:

```html
<div id="app"></div>
<script type="module" src="app.js"></script>
```

2. Create `app.js` next to it, importing from the framework (adjust the `src/`
   path to wherever the framework lives relative to your file):

```js
import { h, createStore, createRenderer } from "./src/index.js";

const { render } = createRenderer(document.getElementById("app"));

render(h("h1", {}, "Hello world"));
```

3. Serve the folder (any static server works) and open it in the browser.

---

## Your first change: an element with a click event

All four basics — creating an element, adding attributes, nesting, and adding an
event — in one tiny example:

```js
import { h, createRenderer } from "./src/index.js";

const { render } = createRenderer(document.getElementById("app"));

render(
  h("div", { class: "card" },                       // create + attribute
    h("button", {                                    // nest a child...
      type: "button",                                // ...attribute...
      events: {                                      // ...and an event
        click: () => alert("clicked!"),
      },
    }, "Click me"),
  ),
);
```

Key rule: **`events` holds your handlers, not the DOM.** Everything else is a
plain attribute. See [`docs/dom.md`](./docs/dom.md) and
[`docs/events.md`](./docs/events.md) for the full story.

---

## The four pillars

| Feature | Module | What it gives you |
|---------|--------|-------------------|
| DOM abstraction | `core/h.js`, `core/vdom.js`, `core/renderer.js` | A virtual DOM you write as plain objects; the framework diff/patch renders only what changed |
| Event handling | `events/emitter.js` | `on()`, delegation, and a global bus — a deliberate alternative to `addEventListener` |
| State management | `state/store.js` | An observable store; every change flows through a reducer, views re-render on change |
| Routing | `routing/router.js` | URL ⇄ state sync via History API (hash fallback) |

Full API docs live in [`docs/`](./docs/):

- [`docs/guide.md`](./docs/guide.md) — philosophy and "why it works this way"
- [`docs/dom.md`](./docs/dom.md) — creating elements, nesting, attributes, lists
- [`docs/events.md`](./docs/events.md) — event handling and the input bus
- [`docs/state.md`](./docs/state.md) — stores, reducers, subscriptions
- [`docs/routing.md`](./docs/routing.md) — routes and navigation

---

## Example: from spec HTML to code

The classic intro example:

```html
<html>
  <div class="nameSubm">
    <input type="text" placeholder="Insert Name" />
    <input type="submit" placeholder="Submit" />
  </div>
</html>
```

becomes a vnode tree:

```js
h("html", {},
  h("div", { class: "nameSubm" },
    h("input", { type: "text", placeholder: "Insert Name" }),
    h("input", { type: "submit", placeholder: "Submit" }),
  ),
);
```

This is exactly the shape the framework renders, with two extra reserved keys:
`events` (event map) and `hooks` (`onMount`/`onUpdate`/`onUnmount`).

---

## Running the tests

```bash
npm test
```

The suite covers virtual-DOM reconciliation (mount/patch/keyed lists/events/
unmount hooks), the emitter, the store, the router, and a full integration test
of todoMVC using jsdom.
