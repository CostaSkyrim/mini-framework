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
will not duplicate or leak handlers. (Internally these are **direct** listeners
on each node; delegation via `delegate()` is a separate, optional utility.)

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
keyboard/controller input through a single place. It is independent of the
`events` map on vnodes and of the renderer; use it when you have a stable root
and many interchangeable descendants.

A throwing handler never stops the others: `emit()` and the store both report
the error (see `setErrorHandler`) and continue notifying the remaining
subscribers.

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

## Error reporting (`setErrorHandler`)

User callbacks — event handlers on the bus (`emit`) and store subscribers —
are invoked defensively. If one throws, the error is routed to a single
reporter rather than crashing the framework, and the remaining callbacks still
run.

```js
import { setErrorHandler } from "../src/index.js";

// Replace the default console.error reporter with your own:
setErrorHandler((error, context) => {
  console.log("caught", error, "in", context); // e.g. store subscriber, event "player:score"
});

// Or silence errors entirely (useful in tests):
setErrorHandler(null);
```

Any non-function argument restores the default reporter. The `context` string
identifies where the failure happened (e.g. `store subscriber` or an event
name).

---

## Keyboard input (the seed of the game input layer)

```js
import { on, keyEvent } from "../src/index.js";

on(window, "keydown", (e) => {
  console.log(keyEvent("keydown", e)); // e.g. "keydown:ArrowLeft"
});
```

`keyEvent(type, e)` normalizes a raw keyboard event into a framework string
(`"keydown:ArrowLeft"`, `"keyup:Space"`). In the planned Bomberman game this is
how raw input becomes named actions (`move:left`, `bomb:place`) that netcode can
replay frame by frame.
