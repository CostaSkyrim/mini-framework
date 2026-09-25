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

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
