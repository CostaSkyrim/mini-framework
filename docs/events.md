# Event handling

mini-framework provides its own event layer as an alternative to
`addEventListener`. You attach handlers when declaring elements (via `events`),
or use the framework's `on()` / `delegate()` helpers and the global
`emit()` / `subscribe()` bus.

---

## Attaching events to elements

Add an `events` map to an element's `props`:

```js
import { h } from "../src/index.js";

h("button", {
  events: {
    click: (e) => console.log("clicked", e),
  },
}, "Click me");
```

Any standard DOM event type works (`click`, `input`, `keydown`, `submit`, …).
The framework adds and removes these listeners automatically as nodes mount,
update, and unmount — you never have to manage them by hand, and re-rendering
will not duplicate or leak handlers.

### Reacting to every keystroke

```js
h("input", {
  events: {
    input: (e) => console.log(e.target.value),
    keydown: (e) => {
      if (e.key === "Enter") submit();
    },
  },
});
```

---

## `on()` — subscribe to an event

For events on elements you already hold a reference to:

```js
import { on } from "../src/index.js";

const off = on(el, "click", (e) => console.log("clicked"));
off(); // unsubscribe
```

This is the framework's explicit, fluent equivalent of `addEventListener`, with
a built-in unsubscribe handle.

---

## `delegate()` — one listener, many targets

Attach a single listener to a root that fires for any matching descendant:

```js
import { delegate } from "../src/index.js";

const off = delegate(document.body, "click", ".item", (e, target) => {
  console.log("clicked", target);
});
```

Delegation keeps one predictable event path — important later for routing all
keyboard/controller input through a single place.

---

## The global bus — `emit` / `subscribe`

For events that are **not** DOM events (app-level notifications), use the bus:

```js
import { emit, subscribe } from "../src/index.js";

const off = subscribe("player:score", (points) => console.log(points));
emit("player:score", 10);
off();
```

---

## Keyboard input (the seed of the game input layer)

```js
import { on, keyEvent } from "../src/index.js";

on(window, "keydown", (e) => {
  console.log(keyEvent("keydown", e)); // e.g. "keydown:ArrowLeft"
});
```

`keyEvent(type, e)` normalizes a raw keyboard event into a framework string
(`"keydown:ArrowLeft"`, `"keyup: "`). In the planned Bomberman game this is how
raw input becomes named actions (`move:left`, `bomb:place`) that netcode can
replay frame by frame.
