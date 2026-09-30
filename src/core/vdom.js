// vdom.js — render vnodes to real DOM, and diff between vnode trees.
//
// This module owns the boundary between the virtual world (h() output) and the
// real DOM. It has two responsibilities:
//
//   1. `mount(vnode)`  — build a real DOM node from a vnode.
//   2. `patch(old, new)` — compare two vnodes and update the real DOM in place,
//      touching only what changed.
//
// Diffing is *keyed*: when a list of children carries `key` props, we match
// elements by key instead of by position. This makes list reordering and
// insertion cheap, which matters both for reactive UIs and for a per-frame game
// loop (sprite/entity lists).

// Events declared in a vnode's `events` map are attached as *direct* listeners
// on the real node (not routed through the emitter). We keep a registry of live
// listeners per real node so we can replace/remove them safely across patches.
// (The emitter's `delegate()` is a separate, optional utility.)
import { DEV, warn } from "../diagnostics.js";

const listenerRegistry = new WeakMap(); // realNode -> Map(eventType -> handler)

// Parents we have already warned about, so a bad list is reported once, not on
// every patch.
const warnedParents = new WeakSet();

/**
 * Build a real DOM node from a vnode and attach its event listeners.
 */
export function mount(vnode) {
  if (vnode.tag === "#text") {
    return document.createTextNode(vnode.text);
  }

  const el = document.createElement(vnode.tag);

  // Attributes.
  for (const [name, value] of Object.entries(vnode.props)) {
    setAttribute(el, name, value);
  }

  // Events — attached directly on the node and tracked in the listener
  // registry so patches can replace or detach them cleanly.
  for (const [type, handler] of Object.entries(vnode.events)) {
    attachListener(el, type, handler);
  }

  // Children.
  for (const child of vnode.children) {
    el.appendChild(mount(child));
  }

  // Invoke onMount after the node and its subtree are in the DOM.
  if (vnode.hooks?.onMount) {
    queueMicrotask(() => vnode.hooks.onMount(el));
  }

  return el;
}

/**
 * Update `dom` (backed by `oldVnode`) to reflect `newVnode`. Returns the new
 * real DOM node.
 */
export function patch(dom, oldVnode, newVnode) {
  // Replace wholesale when the node kind changed.
  if (oldVnode.tag !== newVnode.tag) {
    const el = mount(newVnode);
    dom.parentNode.replaceChild(el, dom);
    unmountTree(oldVnode, dom);
    return el;
  }

  if (newVnode.tag === "#text") {
    if (oldVnode.text !== newVnode.text) {
      dom.nodeValue = newVnode.text;
    }
    return dom;
  }

  // Update attributes.
  patchAttributes(dom, oldVnode.props || {}, newVnode.props || {});

  // Update events.
  patchEvents(dom, oldVnode.events || {}, newVnode.events || {});

  // Update children (keyed reconciliation).
  patchChildren(dom, oldVnode.children || [], newVnode.children || []);

  // Invoke onUpdate when the vnode was re-rendered in place.
  if (newVnode.hooks?.onUpdate) {
    newVnode.hooks.onUpdate(dom, oldVnode);
  }

  return dom;
}

function patchAttributes(el, oldProps, newProps) {
  const all = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  for (const name of all) {
    const oldVal = oldProps[name];
    const newVal = newProps[name];
    if (newVal === undefined || newVal === null || newVal === false) {
      removeAttribute(el, name);
    } else if (oldVal !== newVal) {
      setAttribute(el, name, newVal);
    }
  }
}

function patchEvents(el, oldEvents, newEvents) {
  const all = new Set([...Object.keys(oldEvents), ...Object.keys(newEvents)]);
  for (const type of all) {
    const oldH = oldEvents[type];
    const newH = newEvents[type];
    if (oldH && !newH) {
      detachListener(el, type);
    } else if (newH && oldH !== newH) {
      attachListener(el, type, newH); // replaces previous automatically
    }
  }
}

function patchChildren(parentEl, oldKids, newKids) {
  if (DEV) warnChildKeys(parentEl, newKids);

  // Match old children to new ones by key. A child without an explicit `key`
  // falls back to its position ("__index__N"); such children are diffed
  // positionally, so inserting/deleting in the middle can shift node identity.
  const oldByKey = new Map();
  oldKids.forEach((vnode, i) => {
    oldByKey.set(vnode.props?.key ?? ("__index__" + i), { vnode, index: i });
  });

  // Snapshot the existing real children.
  const domChildren = Array.from(parentEl.childNodes);

  // Build the new DOM list by reusing matched nodes and mounting the rest.
  const newDom = new Array(newKids.length);
  const usedOld = new Set();

  newKids.forEach((newVnode, i) => {
    const key = newVnode.props?.key ?? ("__index__" + i);
    const oldEntry = oldByKey.get(key);

    if (oldEntry && !usedOld.has(oldEntry.index)) {
      newDom[i] = patch(
        domChildren[oldEntry.index],
        oldEntry.vnode,
        newVnode,
      );
      usedOld.add(oldEntry.index);
    } else {
      newDom[i] = mount(newVnode);
    }
  });

  // Unmount (post-order) and remove old nodes that were not reused.
  oldKids.forEach((oldVnode, i) => {
    if (!usedOld.has(i)) {
      unmountTree(oldVnode, domChildren[i]);
      parentEl.removeChild(domChildren[i]);
    }
  });

  // Place new nodes in order (append or insertBefore as needed).
  newDom.forEach((dom, i) => {
    const existing = parentEl.childNodes[i];
    if (existing && existing !== dom) {
      parentEl.insertBefore(dom, existing);
    } else if (!existing) {
      parentEl.appendChild(dom);
    }
    // If existing === dom, it is already in place.
  });
}

/**
 * Fire `onUnmount` for `vnode` and every descendant, children first (post-order).
 * `dom` is the real node backing `vnode`; descendants are paired positionally
 * with `dom.childNodes` (they were mounted in the same order).
 */
function unmountTree(vnode, dom) {
  if (!vnode) return;
  const children = vnode.children || [];
  for (let i = 0; i < children.length; i++) {
    unmountTree(children[i], dom?.childNodes?.[i]);
  }
  vnode.hooks?.onUnmount?.(dom);
}

/**
 * Developer warning for the two silent footguns of list rendering: mixing
 * keyed and unkeyed siblings, and duplicate keys. Reported once per parent.
 */
function warnChildKeys(parentEl, kids) {
  if (warnedParents.has(parentEl)) return;

  const keys = kids.map((k) => k?.props?.key);
  const anyKey = keys.some((k) => k !== undefined);
  const allKeyed = keys.every((k) => k !== undefined);

  let problem = null;
  if (anyKey && !allKeyed) {
    problem = "a mix of keyed and unkeyed children";
  } else if (allKeyed) {
    const seen = new Set();
    const duplicates = new Set();
    for (const key of keys) {
      if (seen.has(key)) duplicates.add(key);
      else seen.add(key);
    }
    if (duplicates.size > 0) {
      problem = `duplicate key(s): ${[...duplicates].join(", ")}`;
    }
  }

  if (problem) {
    warnedParents.add(parentEl);
    warn(
      `children of <${(parentEl.tagName || "?").toLowerCase()}> have ${problem}. ` +
        "Unkeyed children are diffed by position, so node identity (focus, " +
        "input value) can shift when items are inserted or removed. Give every " +
        "sibling a stable `key`.",
    );
  }
}

function setAttribute(el, name, value) {
  if (name === "className") {
    el.setAttribute("class", value);
  } else if (name in el && name !== "list" && name !== "style") {
    el[name] = value;
  } else {
    el.setAttribute(name, value);
  }
}

function removeAttribute(el, name) {
  if (name === "className") {
    el.removeAttribute("class");
  } else if (name in el) {
    el[name] = "";
  } else {
    el.removeAttribute(name);
  }
}

function attachListener(el, type, handler) {
  let map = listenerRegistry.get(el);
  if (!map) {
    map = new Map();
    listenerRegistry.set(el, map);
  }
  // Remove an existing handler for this type before adding the new one.
  if (map.has(type)) {
    el.removeEventListener(type, map.get(type));
  }
  map.set(type, handler);
  el.addEventListener(type, handler);
}

function detachListener(el, type) {
  const map = listenerRegistry.get(el);
  if (map && map.has(type)) {
    el.removeEventListener(type, map.get(type));
    map.delete(type);
  }
}
