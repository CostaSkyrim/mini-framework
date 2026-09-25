# State management

State is the outcome of all the actions the user (or the system) has taken
since the page loaded. mini-framework keeps that state in a single, observable
**store**, reachable from anywhere — so multiple views can render from the same
truth without drifting.

---

## Creating a store

A store wraps a **reducer** — a pure function `(state, action) => newState`:

```js
import { createStore } from "../src/index.js";

const initialState = { count: 0 };

function reducer(state, action) {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + 1 };
    case "DECREMENT":
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
}

const store = createStore(reducer, initialState);
```

---

## Reading and changing state

```js
store.getState();            // { count: 0 }
store.dispatch({ type: "INCREMENT" });
store.getState();            // { count: 1 }
```

> **Rule:** never mutate state in place. Always return a new object (or the same
> object to signal "no change"). Returning the identical reference suppresses
> notifications — useful for no-op actions.

---

## Subscribing to changes

```js
const unsubscribe = store.subscribe(({ state, action }) => {
  console.log("changed to", state, "because of", action);
});
unsubscribe();
```

The listener receives `{ state, action }`. This is how views re-render: in the
todoMVC example, `store.subscribe(draw)` re-runs the renderer on every change.

---

## Multiple slices — `combineReducers`

For larger apps, keep independent concerns in separate reducers and combine
them:

```js
import { createStore, combineReducers } from "../src/index.js";

const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer,
});

const store = createStore(rootReducer, rootReducer(undefined, {}));
```

Each key manages its own slice of state.

---

## Why this matters for the future

The store is a **snapshot factory**: state is a plain, serializable object and
every transition is an explicit action. That is precisely what a multiplayer
game's netcode needs — the server can `dispatch` authoritative snapshots into a
`gameState` store and every system (rendering, sound, UI) re-reads the same
truth each frame, enabling frame synchronization and rollback.

---

## Common pattern: view as a function of state

```js
import { h, createStore, createRenderer } from "../src/index.js";

const store = createStore(reducer, initialState);
const { render } = createRenderer(document.getElementById("app"));

function view(state) {
  return h("h1", {}, `Count: ${state.count}`);
}

store.subscribe(() => render(view(store.getState())));
render(view(store.getState()));
```

Render is always `view(state)`, so the UI can never disagree with the data.
