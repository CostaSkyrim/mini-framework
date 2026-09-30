// renderer.js — reconcile a vnode tree onto a container.
//
// This is the framework's entry point to the DOM: `render(container, vnode)`
// attaches a fresh tree on first call, then diffs subsequent trees in place.
//
// A `createRenderer(container)` factory is also provided for apps that mount
// multiple independent roots (e.g. a UI layer and a game canvas).

import { mount, patch } from "./vdom.js";

/**
 * Create a renderer bound to a single container/root.
 *
 * @param {Element} container
 * @returns {{ render: (vnode) => Element }}
 */
export function createRenderer(container) {
  let currentVnode = null;
  let currentDom = null;

  function render(newVnode) {
    if (!currentVnode) {
      container.textContent = "";
      currentDom = mount(newVnode);
      container.appendChild(currentDom);
      currentVnode = newVnode;
      return currentDom;
    }
    currentDom = patch(currentDom, currentVnode, newVnode);
    currentVnode = newVnode;
    return currentDom;
  }

  return { render };
}

// Convenience singleton renderer for single-root apps, created lazily on the
// first `render()` call so importing the framework does not assume a DOM.

let defaultRenderer = null;

function getDefaultRenderer() {
  if (!defaultRenderer) {
    defaultRenderer = createRenderer(document.body);
  }
  return defaultRenderer;
}

/**
 * Reconcile `vnode` onto an explicit container, using a throwaway renderer
 * (i.e. a fresh mount, not a diff against a previous tree).
 */
export function mountTo(container, vnode) {
  const r = createRenderer(container);
  return r.render(vnode);
}

/**
 * Reconcile `newVnode` onto the default root (document.body).
 */
export function render(newVnode) {
  return getDefaultRenderer().render(newVnode);
}
