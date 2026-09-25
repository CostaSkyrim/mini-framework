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

// Synthetic event handling is delegated through the emitter (see
// src/events/emitter.js). We keep a registry of live listeners per real node so
// we can add/remove them safely across patches.
const listenerRegistry = new WeakMap(); // realNode -> Map(eventType -> handler)

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

  // Events — delegated through the emitter so that a single `on(type, handler)`
  // call origin works regardless of how the node was constructed.
  for (const [type, handler] of Object.entries(vnode.events)) {
    attachListener(el, type, handler);
  }

  // Children.
  for (const child of vnode.children) {
    el.appendChild(mount(child));
  }

  el.__vnode = vnode;

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
    if (oldVnode.hooks?.onUnmount) oldVnode.hooks.onUnmount(dom);
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

  dom.__vnode = newVnode;

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
  const keyedOld = keyedMap(oldKids);
  const keyedNew = keyedMap(newKids);

  // Fast path: no keys anywhere — diff positionally.
  if (!keyedOld.hasUnkeyed && !keyedNew.hasUnkeyed) {
    // handled below via same keyed algorithm; unkeyed just uses index keys
  }

  // Assign implicit index keys when a child lacks an explicit key. This keeps
  // a single code path while still stabilizing order.
  const oldByKey = new Map();
  const newByKey = new Map();

  oldKids.forEach((vnode, i) => {
    const key = vnode.props?.key ?? ("__index__" + i);
    oldByKey.set(key, { vnode, index: i });
  });
  newKids.forEach((vnode, i) => {
    const key = vnode.props?.key ?? ("__index__" + i);
    newByKey.set(key, { vnode, index: i });
  });

  // Existing real children.
  const domChildren = Array.from(parentEl.childNodes);

  // Build new DOM list by reusing/mounting.
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

  // Remove old nodes not reused.
  oldKids.forEach((oldVnode, i) => {
    if (!usedOld.has(i)) {
      if (oldVnode.hooks?.onUnmount) oldVnode.hooks.onUnmount(domChildren[i]);
      parentEl.removeChild(domChildren[i]);
    }
  });

  // Insert in correct order (append or insertBefore as needed).
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

function keyedMap(kids) {
  let hasUnkeyed = false;
  const map = new Map();
  kids.forEach((k, i) => {
    const key = k?.props?.key ?? ("__index__" + i);
    if (!k?.props?.key) hasUnkeyed = true;
    map.set(key, { vnode: k, index: i });
  });
  map.hasUnkeyed = hasUnkeyed;
  return map;
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
