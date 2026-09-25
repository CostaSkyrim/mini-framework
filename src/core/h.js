// h.js — element factory for the virtual DOM.
//
// h() is the primary way to declare the structure of your UI. It returns a
// plain virtual node (vnode) object. Nothing touches the real DOM here; that
// is the renderer's job.

/**
 * Create a virtual node.
 *
 * @param {string|Function} tag  Tag name ("div"), or a component function that
 *                               returns a vnode.
 * @param {object} [props]       Attributes AND events for the node. The special
 *                               `events` key holds the event map (see emitter).
 * @param {Array} [children]     Child vnodes. Strings/numbers are normalized to
 *                               text nodes, `null`/`false`/`undefined` to empty.
 * @returns {object} vnode
 */
export function h(tag, props, ...children) {
  // Normalize children: `h("div", null, [a, b])` and `h("div", null, a, b)`
  // should behave identically, so flatten one level of nesting.
  let kids = children.length === 1 && Array.isArray(children[0])
    ? children[0]
    : children;

  kids = kids.flat(Infinity);

  // Split props into attributes (DOM props), events (our emitter's map), and
  // lifecycle hooks (onMount/onUpdate/onUnmount) which the renderer invokes.
  const {
    events = {},
    onMount,
    onUpdate,
    onUnmount,
    ...attrs
  } = props || {};

  return {
    tag,
    props: attrs,
    events,
    hooks: { onMount, onUpdate, onUnmount },
    children: kids.map(normalizeChild).filter((c) => c !== null),
  };
}

/**
 * Normalize a child into a known vnode kind.
 *  - strings/numbers   -> text vnode
 *  - objects           -> element vnode (already built via h)
 *  - null/undefined/boolean(false) -> null (ignored)
 */
function normalizeChild(child) {
  if (child === null || child === undefined || child === false) {
    return null;
  }
  if (typeof child === "string" || typeof child === "number") {
    return { tag: "#text", props: {}, events: {}, children: [], text: String(child) };
  }
  return child;
}

/**
 * Shortcut: create a text node.
 */
export function text(value) {
  return { tag: "#text", props: {}, events: {}, children: [], text: String(value) };
}

export default h;
