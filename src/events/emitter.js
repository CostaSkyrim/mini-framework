// emitter.js — the framework's event system.
//
// This is intentionally NOT `addEventListener`. It provides:
//
//   1. `on(target, type, handler)` — subscribe to a DOM event on a target, with
//      a fluent, framework-owned API (returns an `off` function).
//   2. A global publish/subscribe bus (`emit` / `subscribe`) for non-DOM,
//      app-level events.
//
// Why a dedicated layer instead of raw addEventListener?
//   - It is the single place where input is normalized. For the Bomberman game
//     this becomes the input bus: keyboard/controller events are remapped to
//     named game actions (`move:left`, `bomb:place`) which game classes
//     subscribe to. Netcode can later *replay* those same events frame-by-frame
//     without touching the DOM.
//   - Delegation: `delegate()` gives you one listener per root/type that routes
//     events to matching descendants, with lifecycle control we don't get from
//     raw listeners. (The vDOM renderer manages its own listeners separately.)

import { reportError } from "../diagnostics.js";

// Global event bus (publish/subscribe).
const bus = new Map(); // eventName -> Set<handler>

const delegatedRoots = new WeakMap(); // root -> Map<eventType, delegator>

/**
 * Subscribe to a DOM event on a target element.
 *
 * @param {Element} target
 * @param {string} type    e.g. "click", "input", "keydown".
 * @param {Function} handler  Receives the native event object.
 * @returns {Function} unsubscribe
 */
export function on(target, type, handler) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}

/**
 * Attach a *delegated* listener: `handler` fires for `type` events bubbling up
 * from any descendant matching `selector`.
 *
 * This lets us bind one listener per root and route events predictably,
 * keeping a single, testable event path for keyboard and other game inputs.
 *
 * @param {Element} root
 * @param {string} type
 * @param {string} selector  CSS selector to match against e.target (closest).
 * @param {Function} handler
 * @returns {Function} unsubscribe
 */
export function delegate(root, type, selector, handler) {
  let map = delegatedRoots.get(root);
  if (!map) {
    map = new Map();
    delegatedRoots.set(root, map);
  }

  let delegator = map.get(type);
  if (!delegator) {
    delegator = (e) => {
      const entry = delegator.handlers; // stable reference, see below
      for (const { sel, fn } of entry) {
        const match = e.target.closest && e.target.closest(sel);
        if (match) fn(e, match);
      }
    };
    delegator.handlers = [];
    map.set(type, delegator);
    root.addEventListener(type, delegator);
  }

  const record = { sel: selector, fn: handler };
  delegator.handlers.push(record);

  return () => {
    const idx = delegator.handlers.indexOf(record);
    if (idx !== -1) delegator.handlers.splice(idx, 1);
    if (delegator.handlers.length === 0) {
      root.removeEventListener(type, delegator);
      map.delete(type);
    }
  };
}

/**
 * Publish an application-level event.
 *
 * @param {string} eventName
 * @param {*} payload
 */
export function emit(eventName, payload) {
  const handlers = bus.get(eventName);
  if (!handlers) return;
  // Snapshot so subscribers that (un)subscribe mid-emit don't disturb the
  // iteration; a throwing handler is reported and doesn't stop the rest.
  for (const fn of [...handlers]) {
    try {
      fn(payload);
    } catch (err) {
      reportError(err, `event "${eventName}"`);
    }
  }
}

/**
 * Subscribe to an application-level event.
 *
 * @param {string} eventName
 * @param {Function} handler
 * @returns {Function} unsubscribe
 */
export function subscribe(eventName, handler) {
  let handlers = bus.get(eventName);
  if (!handlers) {
    handlers = new Set();
    bus.set(eventName, handlers);
  }
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Normalize a raw KeyboardEvent into a framework event string of the form
 * `keydown:ArrowLeft` / `keyup:Space`. This is the seed of the game input bus.
 */
export function keyEvent(type, e) {
  return `${type}:${e.key}`;
}
