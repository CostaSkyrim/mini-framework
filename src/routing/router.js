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
//
// Routers are *instances* (`createRouter`), so an app can mount more than one
// (say, a UI router and a game-menu router) without them clobbering each other.
// A module-level convenience instance (`useRouter` + the bare helpers) preserves
// the original single-router API.

/**
 * Create an independent router.
 *
 * @param {Array<{path: string, view: Function}>} routeList  `path` may contain
 *   `:param` segments.
 * @param {object} [opts]
 * @param {boolean} [opts.hash]     Force hash-based routing.
 * @param {Function} [opts.notFound] Called with `{ path }` when nothing matches.
 * @param {EventTarget} [opts.window] Event target for history/hash events.
 *   Defaults to the global `window`.
 * @returns {object} router instance
 */
export function createRouter(routeList, opts = {}) {
  const win = opts.window || (typeof window !== "undefined" ? window : undefined);
  const routes = routeList.map((r) => ({ ...r, segments: splitPath(r.path) }));
  const notFound = opts.notFound || null;
  const useHash = !!opts.hash || !win || !win.history || !win.history.pushState;

  let currentPath = null;
  let onChangeCallback = null;

  function getCurrentPath() {
    if (useHash) {
      return (win.location.hash || "#/").replace(/^#/, "") || "/";
    }
    return win.location.pathname || "/";
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

  function navigateTo(path) {
    const match = matchRoute(path);
    currentPath = path;

    if (match) {
      onChangeCallback?.({
        path,
        params: match.params,
        route: match.route,
        matched: true,
      });
    } else {
      if (notFound) notFound({ path });
      onChangeCallback?.({ path, params: {}, route: null, matched: false });
    }
  }

  function onUrlChange() {
    navigateTo(getCurrentPath());
  }

  if (win) {
    win.addEventListener(useHash ? "hashchange" : "popstate", onUrlChange);
  }

  function navigate(path) {
    if (!win) {
      navigateTo(path);
      return;
    }
    if (useHash) {
      win.location.hash = "#" + path;
    } else {
      win.history.pushState({}, "", path);
      navigateTo(path);
    }
  }

  /**
   * Set the callback invoked whenever the active route changes. The callback
   * receives `{ path, params, route, matched }`. Returns an unsubscriber.
   */
  function onRouteChange(cb) {
    onChangeCallback = cb;
    return () => {
      if (onChangeCallback === cb) onChangeCallback = null;
    };
  }

  function getCurrentRoute() {
    return currentPath;
  }

  /** Detach the router's URL listener and stop invoking callbacks. */
  function destroy() {
    if (win) win.removeEventListener(useHash ? "hashchange" : "popstate", onUrlChange);
    onChangeCallback = null;
  }

  // Resolve the initial route.
  if (win) navigateTo(getCurrentPath());

  return {
    navigate,
    onRouteChange,
    getCurrentRoute,
    destroy,
    matchRoute,
    get useHash() {
      return useHash;
    },
  };
}

// ---------------------------------------------------------------------------
// Default instance + convenience facade (single-router apps).
// ---------------------------------------------------------------------------

let defaultRouter = null;
let pendingCallback = null;

/**
 * Register routes on the default router. Replaces any previous default router.
 */
export function useRouter(routeList, opts = {}) {
  if (defaultRouter) defaultRouter.destroy();
  defaultRouter = createRouter(routeList, opts);
  if (pendingCallback) {
    defaultRouter.onRouteChange(pendingCallback);
    pendingCallback = null;
  }
  return defaultRouter;
}

/**
 * Programmatically navigate the default router.
 */
export function navigate(path) {
  if (!defaultRouter) {
    throw new Error("useRouter() must be called before navigate()");
  }
  return defaultRouter.navigate(path);
}

/**
 * Set the change callback on the default router. May be called before
 * `useRouter`; the callback is applied when the router is created.
 */
export function onRouteChange(cb) {
  if (defaultRouter) return defaultRouter.onRouteChange(cb);
  pendingCallback = cb;
  return () => {
    if (pendingCallback === cb) pendingCallback = null;
  };
}

export function getCurrentRoute() {
  return defaultRouter ? defaultRouter.getCurrentRoute() : null;
}

function splitPath(path) {
  return (path || "/").split("/").filter(Boolean);
}
