// Router tests. Uses lightweight fake windows so multiple independent routers
// can be exercised without touching a real DOM or global state.

import {
  createRouter,
  useRouter,
  navigate,
  onRouteChange,
  getCurrentRoute,
} from "../src/routing/router.js";

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
}

function makeWindow(initialPath = "/") {
  const listeners = new Map();
  return {
    location: { pathname: initialPath, hash: "" },
    history: {
      pushState(_state, _title, url) {
        this._url = url;
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of [...(listeners.get(type) || [])]) fn({ type });
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    },
  };
}

// 1. :param resolution + change payload
{
  const win = makeWindow("/user/42");
  const router = createRouter([{ path: "/" }, { path: "/user/:id" }], { window: win });
  let last = null;
  router.onRouteChange((e) => (last = e));
  router.navigate("/user/42");
  assert(
    last && last.path === "/user/42" && last.params.id === "42" && last.matched === true,
    "resolves :param and reports matched",
  );
  assert(router.getCurrentRoute() === "/user/42", "getCurrentRoute tracks the path");
  assert(win.history._url === "/user/42", "history mode pushes the URL");
}

// 2. notFound callback for unmatched paths
{
  const win = makeWindow("/");
  let missing = null;
  const router = createRouter([{ path: "/" }], {
    window: win,
    notFound: ({ path }) => (missing = path),
  });
  let last = null;
  router.onRouteChange((e) => (last = e));
  router.navigate("/nope");
  assert(missing === "/nope", "notFound is called with the path");
  assert(last.matched === false && last.route === null, "callback reports an unmatched route");
}

// 3. hash mode reads and writes location.hash
{
  const win = makeWindow("/");
  win.location.hash = "#/a";
  const router = createRouter([{ path: "/a" }], { window: win, hash: true });
  let last = null;
  router.onRouteChange((e) => (last = e));
  win.dispatch("hashchange");
  assert(last && last.path === "/a", "hash mode resolves from location.hash");
  router.navigate("/a");
  assert(win.location.hash === "#/a", "hash-mode navigate sets location.hash");
  assert(router.useHash === true, "useHash reflects configuration");
}

// 4. independent routers + destroy
{
  const winA = makeWindow("/");
  const winB = makeWindow("/");
  const a = createRouter([{ path: "/a" }], { window: winA });
  const b = createRouter([{ path: "/b" }], { window: winB });
  let aCalls = 0;
  let bCalls = 0;
  a.onRouteChange(() => aCalls++);
  b.onRouteChange(() => bCalls++);
  winA.dispatch("popstate");
  winB.dispatch("popstate");
  a.navigate("/a");
  b.navigate("/b");
  assert(aCalls === 2 && bCalls === 2, "routers track navigations independently");
  a.destroy();
  a.navigate("/a");
  assert(aCalls === 2, "destroyed router stops notifying");
  b.navigate("/b");
  assert(bCalls === 3, "the other router keeps working");
}

// 5. first matching route wins
{
  const win = makeWindow("/");
  const router = createRouter([{ path: "/:x" }, { path: "/fixed" }], { window: win });
  let seen = null;
  router.onRouteChange(({ route, params }) => (seen = { path: route.path, params }));
  router.navigate("/fixed");
  assert(seen.path === "/:x" && seen.params.x === "fixed", "first matching route wins");
}

// 6. facade: callback-before-useRouter, and re-use does not stack listeners
{
  const prevWindow = globalThis.window;
  const win = makeWindow("/");
  globalThis.window = win;

  const seen = [];
  onRouteChange(({ path }) => seen.push(path)); // registered before the router exists
  useRouter([{ path: "/" }, { path: "/x" }]);
  navigate("/x");
  assert(seen.join(",") === "/x", "callback set before useRouter is applied");
  assert(getCurrentRoute() === "/x", "facade getCurrentRoute works");

  const win2 = makeWindow("/");
  globalThis.window = win2;
  useRouter([{ path: "/" }]);
  assert(win2.listenerCount("popstate") === 1, "facade registers one URL listener");
  useRouter([{ path: "/" }]);
  assert(win2.listenerCount("popstate") === 1, "re-use replaces the listener (no stacking)");

  if (prevWindow === undefined) delete globalThis.window;
  else globalThis.window = prevWindow;
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
