// diagnostics.js — shared, environment-aware reporting for the framework.
//
// Two concerns live here so the rest of the framework can stay silent in
// production:
//
//   1. `DEV` / `warn(...)` — developer warnings (e.g. suspicious list keys).
//      They are printed only while `globalThis.__MINI_DEV__` is not `false`,
//      which lets a production build silence them entirely.
//   2. `setErrorHandler` / `reportError` — a single place through which a
//      throwing event handler or store subscriber is surfaced, so one bad
//      callback cannot abort the remaining ones.

/**
 * True while developer warnings are enabled. Set `globalThis.__MINI_DEV__ =
 * false` (e.g. in a production build) to silence them.
 */
export const DEV = typeof globalThis !== "undefined" && globalThis.__MINI_DEV__ !== false;

/** Emit a developer warning, prefixed and gated by {@link DEV}. */
export function warn(...args) {
  if (DEV) console.warn("[mini-framework]", ...args);
}

// Default reporter: log to the console. Overridable, or set to `null` to
// silence errors (handy in tests).
let errorHandler = (err, context) => {
  console.error("[mini-framework]", context, err);
};

/**
 * Replace the error reporter used by {@link reportError}. Pass `null` to
 * silence errors, or `undefined`/a non-function to restore the default.
 *
 * @param {Function|null} handler `(error, context) => void`
 */
export function setErrorHandler(handler) {
  errorHandler =
    handler === null
      ? null
      : typeof handler === "function"
        ? handler
        : (err, context) => console.error("[mini-framework]", context, err);
}

/** Report an error caught while invoking user code. */
export function reportError(error, context) {
  if (errorHandler) errorHandler(error, context);
}
