# Routing

Routing synchronizes the app's **state with the URL**. When the user triggers an
action that changes the URL, the router notifies the app, which re-reads state
and re-renders. It works in both directions — pasting a URL deep-links straight
into the matching view.

---

## Registering routes

```js
import { useRouter } from "../src/index.js";

useRouter([
  { path: "/",           view: homeView },
  { path: "/about",      view: aboutView },
  { path: "/user/:id",   view: userView },
]);
```

- `path` may contain `:param` segments (e.g. `:id`).
- A route's `view` is a function you provide; the router informs you of changes
  via `onRouteChange`.
- `useRouter` configures a single, process-wide **default** router. Calling it
  again replaces the previous one (its URL listener is detached). For more than
  one router, use `createRouter` (see below).

---

## Reacting to navigation

```js
import { onRouteChange } from "../src/index.js";

onRouteChange(({ path, params, route, matched }) => {
  console.log("now at", path, "with params", params);
  // re-render here
});
```

The callback receives the resolved `path`, any `:param` values, the matched
`route` (or `null`), and a `matched` boolean. `onRouteChange` may be called
before `useRouter`; the callback is applied when the router is created.

For unmatched paths, `useRouter(routes, { notFound: ({ path }) => … })` is
invoked (and the change callback still fires with `matched: false`).

---

## Programmatic navigation

```js
import { navigate } from "../src/index.js";

navigate("/about");
```

`navigate()` updates the URL and triggers the route change callback.

---

## History vs hash routing

By default the router uses the History API (`pushState`). If it is unavailable
(e.g. `file://` or a simple static server), it **falls back automatically** to
hash routing (`#/about`).

You can force hash routing:

```js
useRouter(routes, { hash: true });
```

When using hash routing, navigate by setting the hash:

```js
window.location.hash = "#/about";
```

---

## Multiple routers, and teardown

`useRouter` manages one default router. When you need several (for example a UI
router and a game-menu router), create them explicitly:

```js
import { createRouter } from "../src/index.js";

const ui = createRouter([{ path: "/", view: home }]);
const menu = createRouter([{ path: "/menu", view: menuView }], { hash: true });

ui.navigate("/");
menu.destroy(); // detach the URL listener and stop invoking callbacks
```

Each router keeps its own routes and listener, so they never clobber each
other. `createRouter(routes, opts)` accepts `{ hash, notFound, window }`; the
`window` option (an `EventTarget` with `location`/`history`) is mainly for
testing.

## todoMVC usage

The example app registers three routes mapping to the same view but different
filters, and drives the router in **hash mode** to match the `#/active` links in
`index.html`:

```js
const router = useRouter([
  { path: "/",           view },
  { path: "/active",     view },
  { path: "/completed",  view },
], { hash: true });

router.onRouteChange(({ path }) => {
  app.currentFilter = path === "/active" ? "active"
    : path === "/completed" ? "completed"
    : "all";
  draw();
});
```

Navigating (by link or `router.navigate`) changes the hash; the router resolves
the path and re-derives the filter.

## Helpers

- `createRouter(routes, opts)` — create an independent router instance.
- `useRouter(routes, opts)` — configure the default router.
- `navigate(path)` / `onRouteChange(cb)` / `getCurrentRoute()` — operate on the
  default router.
- `router.destroy()` — detach a router's URL listener.
