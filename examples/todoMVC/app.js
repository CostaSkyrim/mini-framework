// app.js — wire store, router, and renderer together.
//
// This is the composition root: it demonstrates how the framework's pieces
// (store + router + renderer) cooperate to build an app.

import { createRenderer, useRouter, onRouteChange } from "../../src/index.js";
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
  navigate: (p) => { window.location.hash = "#" + p; },
  currentFilter: "all",
};

function currentFilterFromHash() {
  const h = window.location.hash;
  if (h === "#/active") return "active";
  if (h === "#/completed") return "completed";
  return "all";
}

function draw() {
  app.state = store.getState();
  app.currentFilter = currentFilterFromHash();
  const filter = filterFor(app.currentFilter);
  render(view(app, filter));
}

// Re-render on every state change.
store.subscribe(draw);

// React to URL changes.
onRouteChange(draw);

useRouter([
  { path: "/", view },
  { path: "/active", view },
  { path: "/completed", view },
]);

draw();
