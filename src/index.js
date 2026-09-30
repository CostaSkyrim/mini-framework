// index.js — public API surface of the framework.

export { h, text } from "./core/h.js";
export { mount, patch } from "./core/vdom.js";
export { mountTo, render, createRenderer } from "./core/renderer.js";
export { on, delegate, emit, subscribe, keyEvent } from "./events/emitter.js";
export { createStore, combineReducers } from "./state/store.js";
export { createRouter, useRouter, navigate, onRouteChange, getCurrentRoute } from "./routing/router.js";
export { tick, stopTick, extractHooks, stripHooks } from "./lifecycle/hooks.js";
export { setErrorHandler } from "./diagnostics.js";
