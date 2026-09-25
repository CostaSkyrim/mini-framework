// router.js — URL ⇄ state synchronization.
//
// The router maps URL paths to render functions. When the URL changes (via a
// link click or programmatic navigation), the matching route's render function
// runs and can re-render the view from store state; navigation state lives
// alongside app state so it is reachable everywhere.
//
// Uses the History API when available, falling back to hash-based routing
// ("#/path") when served from environments that do not support pushState
// (e.g., file:// or simple static servers).

let routes = [];
let currentPath = null;
let notFound = null;
let onChangeCallback = null;
let useHash = false;

const emptyFn = () => "";

/**
 * Register routes.
 *
 * @param {Array<{path: string, view: Function}>} routes  `view(state)` must
 *   return a vnode (or null). `path` supports a leading `:param` segment.
 * @param {object} [opts]
 * @param {boolean} [opts.hash]  Force hash-based routing.
 */
export function useRouter(routeList, opts = {}) {
  routes = routeList.map((r) => ({
    ...r,
    segments: splitPath(r.path),
  }));

  useHash = !!opts.hash || typeof history === "undefined" || !history.pushState;

  window.addEventListener(useHash ? "hashchange" : "popstate", () => {
    navigateTo(getCurrentPath());
  });

  if (opts.notFound) notFound = opts.notFound;

  // Initial route.
  navigateTo(getCurrentPath());
}

/**
 * Programmatically navigate to a path (updates URL and triggers render).
 */
export function navigate(path) {
  if (useHash) {
    window.location.hash = "#" + path;
  } else {
    history.pushState({}, "", path);
    navigateTo(path);
  }
}

function navigateTo(path) {
  const match = matchRoute(path);
  currentPath = path;
  if (onChangeCallback) {
    onChangeCallback({ path, params: match ? match.params : {} });
  }
}

function matchRoute(path) {
  const pathSegments = splitPath(path.replace(/^#/, ""));
  for (const route of routes) {
    const params = {};
    if (route.segments.length !== pathSegments.length) continue;
    let ok = true;
    for (let i = 0; i < route.segments.length; i++) {
      const rs = route.segments[i];
      const ps = pathSegments[i];
      if (rs.startsWith(":")) {
        params[rs.slice(1)] = ps;
      } else if (rs !== ps) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

function splitPath(path) {
  return (path || "/").split("/").filter(Boolean);
}

function getCurrentPath() {
  if (useHash) {
    return (window.location.hash || "#/").replace(/^#/, "") || "/";
  }
  return window.location.pathname || "/";
}

/**
 * Set a callback invoked whenever the active route changes.
 * Receives `{ path, params }`.
 */
export function onRouteChange(cb) {
  onChangeCallback = cb;
}

export function getCurrentRoute() {
  return currentPath;
}
