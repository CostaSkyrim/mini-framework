// app.js — wire store, router, and renderer together.
//
// This is the composition root: it demonstrates how the framework's pieces
// (store + router + renderer) cooperate to build an app.

import { createRenderer, useRouter } from "../../src/index.js";
import { createTodoStore, filterFor, newId } from "./store.js";
import { view } from "./view.js";

const container = document.getElementById("app");
const { render } = createRenderer(container);

const store = createTodoStore();

// Application context passed to the view. It bundles the store with the
// helpers the UI needs (id generation, navigation, current filter).
const app = {
  state: store.getState(),
  dispatch: (a) => store.dispatch(a),
  newId,
  currentFilter: "all",
  navigate: () => {}, // replaced once the router exists (below)
};

function filterFromPath(path) {
  if (path === "/active") return "active";
  if (path === "/completed") return "completed";
  return "all";
}

function draw() {
  app.state = store.getState();
  render(view(app, filterFor(app.currentFilter)));
}

// Re-render on every state change.
store.subscribe(draw);

// The links in index.html are hash-shaped (`#/active`), so drive the router in
// hash mode to keep links, deep links, and programmatic navigation consistent.
const router = useRouter(
  [
    { path: "/", view },
    { path: "/active", view },
    { path: "/completed", view },
  ],
  { hash: true },
);

app.navigate = (path) => router.navigate(path);

// React to URL changes by re-deriving the filter from the resolved path.
router.onRouteChange(({ path }) => {
  app.currentFilter = filterFromPath(path);
  draw();
});

// Paint the initial route.
draw();
