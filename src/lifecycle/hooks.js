// hooks.js — lifecycle hooks and the tick/update loop.
//
// Two pieces of lifecycle machinery:
//
//   1. Declarative hooks on components: `onMount` / `onUpdate` / `onUnmount`,
//      stored as props so they survive re-renders.
//
//   2. `tick(update)` — a requestAnimationFrame loop. This is the seed of the
//      Bomberman game loop: `update(deltaTime)` advances simulation state, and
//      the framework re-renders afterwards each frame. Netcode frame-syncing
//      slots in before the render step.

let tickCallback = null;
let rafId = null;
let lastTime = 0;

const LIFECYCLE = ["onMount", "onUpdate", "onUnmount"];

/**
 * Extract lifecycle hooks from a vnode's props so they are not written to the
 * DOM as attributes.
 */
export function extractHooks(props = {}) {
  const hooks = {};
  for (const key of LIFECYCLE) {
    if (typeof props[key] === "function") hooks[key] = props[key];
  }
  return hooks;
}

/**
 * Strip lifecycle hooks from props (used before applying attributes).
 */
export function stripHooks(props = {}) {
  const rest = { ...props };
  for (const key of LIFECYCLE) delete rest[key];
  return rest;
}

/**
 * Start a frame loop. `update(deltaMs)` is called every animation frame; any
 * return value is ignored. Call `stopTick()` to stop.
 */
export function tick(update) {
  tickCallback = update;
  lastTime = performance.now();
  const loop = (now) => {
    const delta = now - lastTime;
    lastTime = now;
    if (tickCallback) tickCallback(delta);
    if (tickCallback) rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return () => stopTick();
}

export function stopTick() {
  tickCallback = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}
