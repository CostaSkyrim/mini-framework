// Emitter tests: on(), delegate(), the global bus, keyEvent, and error
// isolation. Runs against jsdom for realistic event/target behavior.

import { on, delegate, emit, subscribe, keyEvent } from "../src/events/emitter.js";
import { setErrorHandler } from "../src/diagnostics.js";
import { setupDom } from "./helpers.mjs";

const dom = setupDom();

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
}

// 1. on() / off()
{
  const btn = document.createElement("button");
  let hits = 0;
  const off = on(btn, "click", () => hits++);
  btn.dispatchEvent(new dom.window.Event("click"));
  assert(hits === 1, "on() subscribes");
  off();
  btn.dispatchEvent(new dom.window.Event("click"));
  assert(hits === 1, "off() unsubscribes");
}

// 2. delegate()
{
  const root = document.createElement("div");
  root.innerHTML = '<button class="item">x</button><span>y</span>';
  let delegated = 0;
  let sawMatch = false;
  const off = delegate(root, "click", ".item", (_e, match) => {
    delegated++;
    sawMatch = match.classList.contains("item");
  });
  root.querySelector(".item").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  root.querySelector("span").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  assert(delegated === 1, "delegate fires only for matching descendants");
  assert(sawMatch, "delegate passes the matched element");
  off();
  root.querySelector(".item").dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  assert(delegated === 1, "delegate unsubscribe works");
}

// 3. global bus
{
  let got = null;
  const off = subscribe("score", (p) => (got = p));
  emit("score", 10);
  assert(got === 10, "subscribe/emit deliver the payload");
  off();
  emit("score", 20);
  assert(got === 10, "unsubscribe stops delivery");
}

// 4. error isolation on the bus
{
  const captured = [];
  setErrorHandler((err, ctx) => captured.push(ctx));
  let second = false;
  subscribe("evt", () => {
    throw new Error("x");
  });
  subscribe("evt", () => (second = true));
  emit("evt");
  assert(second, "emit continues after a throwing handler");
  assert(captured.length === 1, "emit reports the error once");
  setErrorHandler(undefined);
}

// 5. keyEvent normalization
{
  assert(
    keyEvent("keydown", { key: "ArrowLeft" }) === "keydown:ArrowLeft",
    "keyEvent formats type:key",
  );
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
