// store.js — observable state management (single source of truth).
//
// Modeled on the reducer pattern: every state change flows through a pure
// `reducer(state, action) -> newState` function. The store exposes:
//
//   - getState()          read the current state
//   - dispatch(action)    mutate state via the reducer, then notify subscribers
//   - subscribe(listener) react to any change (listener receives { state, action })
//
// Why a centralized store?
//   - Multiple "pages" / views may render from the same state. The store is the
//     one place they all read from, so nothing drifts out of sync.
//   - For Bomberman: the netcode layer can `dispatch` authoritative snapshots
//     straight into a `gameState` store, and every system (rendering, sound,
//     UI) re-reads the same truth on each tick. Snapshots are trivially
//     serializable, which is exactly what frame-sync / rollback requires.

import { reportError } from "../diagnostics.js";

/**
 * Create a store.
 *
 * @param {Function} reducer (state, action) => newState
 * @param {*} [initialState]
 * @returns {object} store
 */
export function createStore(reducer, initialState = undefined) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function dispatch(action) {
    const next = reducer(state, action);
    if (next === state) return state;
    state = next;
    // Iterate over a snapshot so a subscriber that (un)subscribes mid-dispatch
    // cannot skip or repeat others. A throwing subscriber is reported and does
    // not stop the rest.
    for (const fn of [...listeners]) {
      try {
        fn({ state, action });
      } catch (err) {
        reportError(err, "store subscriber");
      }
    }
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, dispatch, subscribe };
}

/**
 * Combine multiple reducers into one. Each key in `reducers` maps to its own
 * slice of state; actions of type `set:` are namespaced by convention.
 */
export function combineReducers(reducers) {
  return (state = {}, action) => {
    const next = {};
    let changed = false;
    for (const key of Object.keys(reducers)) {
      const prev = state[key];
      const slice = reducers[key](prev, action);
      next[key] = slice;
      if (slice !== prev) changed = true;
    }
    return changed ? next : state;
  };
}
