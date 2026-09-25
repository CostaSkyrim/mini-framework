// Test helper: bootstrap a jsdom document as our global DOM.
import { JSDOM } from "jsdom";

export function setupDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='app'></div></body></html>", {
    url: "http://localhost/",
  });
  for (const key of Object.getOwnPropertyNames(dom.window)) {
    if (!(key in globalThis)) {
      globalThis[key] = dom.window[key];
    }
  }
  return dom;
}
