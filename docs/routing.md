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

---

## Reacting to navigation

```js
import { onRouteChange } from "../src/index.js";

onRouteChange(({ path, params }) => {
  console.log("now at", path, "with params", params);
  // re-render here
});
```

The callback receives the resolved `path` and any `:param` values.

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

## todoMVC usage

The example app registers three routes mapping to the same view but different
filters:

```js
useRouter([
  { path: "/",           view },
  { path: "/active",     view },
  { path: "/completed",  view },
]);
```

The current filter is derived from `window.location.hash`, so `/`,
`#/active`, and `#/completed` each show the matching list.

---

## Helpers

- `getCurrentRoute()` — returns the current path string.
- `onRouteChange(cb)` — set the change callback.
- `navigate(path)` — navigate programmatically.
