import { h } from "../src/core/h.js";
import { mount, patch } from "../src/core/vdom.js";
import { setupDom } from "./helpers.mjs";

setupDom();

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log("  ✓", msg);
  } else {
    failures++;
    console.error("  ✗", msg);
  }
}

// 1. mount basic structure
const v1 = h("div", { id: "root" },
  h("span", { class: "a" }, "hello"),
  h("button", { title: "click me" }, "btn"),
);
const el = mount(v1);
assert(el.tagName === "DIV" && el.id === "root", "mount creates element with attrs");
assert(el.children.length === 2, "mount creates children");
assert(el.children[0].textContent === "hello", "text node child");

// 2. patch attribute + text
const v2 = h("div", { id: "root" },
  h("span", { class: "a" }, "world"),
  h("button", { title: "click me" }, "btn"),
);
patch(el, v1, v2);
assert(el.children[0].textContent === "world", "patch updates text node");

// 3. patch add/remove attribute
const v3 = h("div", { id: "root", "data-x": "1" },
  h("span", { class: "b" }, "world"),
  h("button", {}, "btn"),
);
patch(el, v2, v3);
assert(el.getAttribute("data-x") === "1", "patch adds attribute");
assert(el.children[0].className === "b", "patch changes class");
assert(el.children[1].getAttribute("title") === null || el.children[1].getAttribute("title") === "", "patch removes attribute");

// 4. keyed reconciliation: reorder children
const v4 = h("ul", {},
  h("li", { key: "a" }, "A"),
  h("li", { key: "b" }, "B"),
  h("li", { key: "c" }, "C"),
);
const ul = mount(v4);
const v5 = h("ul", {},
  h("li", { key: "c" }, "C"),
  h("li", { key: "a" }, "A"),
  h("li", { key: "b" }, "B"),
);
patch(ul, v4, v5);
const texts = [...ul.children].map((c) => c.textContent);
assert(texts.join(",") === "C,A,B", "keyed reorder reuses nodes: " + texts.join(","));
assert(ul.children.length === 3, "keyed reorder keeps node count");

// 5. keyed add/remove
const v6 = h("ul", {},
  h("li", { key: "a" }, "A"),
  h("li", { key: "d" }, "D"),
);
patch(ul, v5, v6);
const texts2 = [...ul.children].map((c) => c.textContent);
assert(texts2.join(",") === "A,D", "keyed add/remove: " + texts2.join(","));

// 6. events attach + replace
let clicked = 0;
const btn1 = h("button", { events: { click: () => clicked++ } }, "go");
const btnEl = mount(btn1);
btnEl.click();
assert(clicked === 1, "event fires");
const btn2 = h("button", { events: { click: () => (clicked += 10) } }, "go");
patch(btnEl, btn1, btn2);
btnEl.click();
assert(clicked === 11, "event handler replaced on patch");

// 7. tag change replaces the node and fires onUnmount
let unmounted7 = 0;
const old7 = h("div", { onUnmount: () => unmounted7++ }, h("span", {}, "x"));
const holder7 = document.body;
const dom7 = mount(old7);
holder7.appendChild(dom7);
const after7 = patch(dom7, old7, h("section", {}, "y"));
assert(after7.tagName === "SECTION", "tag change mounts the new node");
assert(holder7.lastChild === after7, "tag change replaces in place");
assert(unmounted7 === 1, "tag change fires onUnmount");
holder7.removeChild(after7);

// 8. unmount propagates through the whole replaced subtree, post-order
const order = [];
const child8 = h("span", { onUnmount: () => order.push("child") }, "c");
const old8 = h("div", { onUnmount: () => order.push("parent") }, child8);
const holder8 = document.body;
const dom8 = mount(old8);
holder8.appendChild(dom8);
patch(dom8, old8, h("section", {}, "new"));
assert(order.join(",") === "child,parent", "unmount is post-order: " + order.join(","));
holder8.removeChild(holder8.lastChild);

// 9. removing a list item unmounts its descendants too
const removed9 = [];
const old9 = h("ul", {},
  h("li", { key: "a" }, "A"),
  h("li", { key: "b" }, h("em", { onUnmount: () => removed9.push("em") }, "B")),
);
const ul9 = mount(old9);
patch(ul9, old9, h("ul", {}, h("li", { key: "a" }, "A")));
assert(removed9.join(",") === "em", "removed subtree fires descendant onUnmount");
assert(ul9.children.length === 1, "removed item is gone");

// 10. dev warning: mixing keyed and unkeyed siblings
let warns = [];
const origWarn = console.warn;
console.warn = (...a) => warns.push(a.join(" "));
const old10 = h("ul", {}, h("li", {}, "a"), h("li", {}, "b"));
const ul10 = mount(old10);
patch(ul10, old10, h("ul", {}, h("li", { key: "a" }, "a"), h("li", {}, "b")));
console.warn = origWarn;
assert(warns.some((w) => w.includes("mix of keyed and unkeyed")), "warns on mixed keys");
assert(warns.some((w) => w.includes("mini-framework")), "warning carries a prefix");

// 11. dev warning: duplicate keys
warns = [];
console.warn = (...a) => warns.push(a.join(" "));
const old11 = h("ul", {}, h("li", { key: "x" }, "1"));
const ul11 = mount(old11);
patch(ul11, old11, h("ul", {}, h("li", { key: "x" }, "1"), h("li", { key: "x" }, "2")));
console.warn = origWarn;
assert(warns.some((w) => w.includes("duplicate key")), "warns on duplicate keys");

// 12. no warning when every sibling is keyed (or every sibling is unkeyed)
warns = [];
console.warn = (...a) => warns.push(a.join(" "));
const old12 = h("ul", {}, h("li", { key: "a" }, "A"));
const ul12 = mount(old12);
patch(ul12, old12, h("ul", {}, h("li", { key: "b" }, "B")));
patch(ul12, h("ul", {}, h("li", { key: "b" }, "B")), h("ul", {}, h("li", {}, "C")));
console.warn = origWarn;
assert(warns.length === 0, "no warning for a consistent list");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
