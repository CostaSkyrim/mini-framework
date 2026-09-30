// Store tests: dispatch/subscribe semantics, bailout, combineReducers, and
// error isolation.

import { createStore, combineReducers } from "../src/state/store.js";
import { setErrorHandler } from "../src/diagnostics.js";

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.error("  ✗", msg);
  }
}

// 1. basic read/write + subscription payload + unsubscribe
{
  const reducer = (state, action) =>
    action.type === "inc" ? { count: state.count + 1 } : state;
  const store = createStore(reducer, { count: 0 });
  assert(store.getState().count === 0, "initial state");

  let payload = null;
  const off = store.subscribe((e) => (payload = e));
  store.dispatch({ type: "inc" });
  assert(store.getState().count === 1, "dispatch updates state");
  assert(
    payload && payload.state.count === 1 && payload.action.type === "inc",
    "subscriber receives { state, action }",
  );

  off();
  store.dispatch({ type: "inc" });
  assert(store.getState().count === 2, "dispatch still works after unsubscribe");
  assert(payload.state.count === 1, "unsubscribed listener is not called");
}

// 2. referential-equality bailout
{
  let calls = 0;
  const store = createStore((state) => state, { v: 1 });
  store.subscribe(() => calls++);
  store.dispatch({ type: "noop" });
  assert(calls === 0, "returning the same state suppresses notification");
}

// 3. combineReducers
{
  const root = combineReducers({
    a: (s = 0, action) => (action.type === "a+" ? s + 1 : s),
    b: (s = 0, action) => (action.type === "b+" ? s + 1 : s),
  });
  const s0 = root(undefined, {});
  assert(s0.a === 0 && s0.b === 0, "seeds each slice");
  const s1 = root(s0, { type: "a+" });
  assert(s1.a === 1 && s1.b === 0, "updates only the targeted slice");
  assert(s1 !== s0, "changed state is a new object");
  const s2 = root(s1, { type: "nope" });
  assert(s2 === s1, "no-op preserves object identity");
}

// 4. error isolation: one throwing subscriber must not stop the others
{
  const captured = [];
  setErrorHandler((err, context) => captured.push(context));

  let secondRan = false;
  const store = createStore((state) => ({ n: (state?.n || 0) + 1 }), { n: 0 });
  store.subscribe(() => {
    throw new Error("boom");
  });
  store.subscribe(() => (secondRan = true));
  store.dispatch({ type: "x" });

  assert(secondRan, "a throwing subscriber does not stop later subscribers");
  assert(captured.length === 1, "the error is reported exactly once");

  setErrorHandler(undefined); // restore the default reporter
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
