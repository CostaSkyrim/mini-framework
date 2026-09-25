import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load the app module in a jsdom window.
const html = readFileSync(join(root, "examples/todoMVC/index.html"), "utf8");
const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only" });

for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) globalThis[key] = dom.window[key];
}
globalThis.document = dom.window.document;
globalThis.window = dom.window;

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("  ✓", msg);
  else { failures++; console.error("  ✗", msg); }
}

// Import the app (this runs useRouter + draws).
await import("../examples/todoMVC/app.js").catch((e) => {
  console.error("APP IMPORT FAILED:", e);
  process.exit(1);
});

await new Promise((r) => setTimeout(r, 20));

const app = document.getElementById("app");

// Header + input present
assert(app.querySelector(".header h1").textContent === "todos", "header renders");
assert(!!app.querySelector(".new-todo"), "new-todo input present");

// Add a todo
const input = app.querySelector(".new-todo");
input.value = "Buy milk";
const form = app.querySelector(".header form");
form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 20));

let items = app.querySelectorAll(".todo-list li");
assert(items.length === 1, "adding todo renders one item");
assert(items[0].querySelector("label").textContent === "Buy milk", "todo title correct");

// Toggle complete
items[0].querySelector(".toggle").dispatchEvent(new dom.window.Event("change", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
items = app.querySelectorAll(".todo-list li");
assert(items[0].classList.contains("completed"), "toggle marks completed");

// Toggle back + edit via dblclick
items[0].querySelector(".toggle").dispatchEvent(new dom.window.Event("change", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
items[0].querySelector("label").dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));

const editInput = app.querySelector(".todo-list li .edit");
assert(!!editInput, "editing mode shows edit input");
editInput.value = "Buy milk and eggs";
editInput.dispatchEvent(new dom.window.FocusEvent("blur", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
items = app.querySelectorAll(".todo-list li");
assert(items[0].querySelector("label").textContent === "Buy milk and eggs", "edit updates title");

// Add second + remove first
input.value = "Second";
form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
await new Promise((r) => setTimeout(r, 20));
items = app.querySelectorAll(".todo-list li");
assert(items.length === 2, "second todo added");
items[0].querySelector(".destroy").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
await new Promise((r) => setTimeout(r, 20));
items = app.querySelectorAll(".todo-list li");
assert(items.length === 1 && items[0].querySelector("label").textContent === "Second", "destroy removes todo");

// Routing: switch to /active
dom.window.location.hash = "#/active";
await new Promise((r) => setTimeout(r, 20));
// filter link selected
const selected = app.querySelector(".filters a.selected");
assert(selected && selected.textContent === "active", "route highlights active filter");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
