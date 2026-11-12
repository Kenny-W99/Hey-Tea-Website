// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { Hand } from "../src/camera/gestures";
const state = vi.hoisted(() => ({ send: (_hand: Hand | null) => {} }));
vi.mock("../src/camera/input", () => ({
  listenHand: (fn: typeof state.send) => { state.send = fn; return () => {}; },
}));
import { HandCursor } from "../src/camera/HandCursor";
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.innerHTML = ""; });
function setup() {
  const modal = document.createElement("dialog");
  const start = document.createElement("button");
  start.className = "intro-start";
  start.dataset.gesturePad = "72";
  start.getBoundingClientRect = () => ({ left: 300, right: 500, top: 400, bottom: 460, width: 200, height: 60 }) as DOMRect;
  modal.append(start); document.body.append(modal);
  const query = document.querySelector.bind(document);
  vi.spyOn(document, "querySelector").mockImplementation(selector => selector === "dialog:modal" ? modal : query(selector));
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => modal });
  Object.defineProperty(HTMLElement.prototype, "checkVisibility", { configurable: true, value: () => true });
  Object.defineProperty(HTMLElement.prototype, "showPopover", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "hidePopover", { configurable: true, value: vi.fn() });
  const matches = Element.prototype.matches;
  vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector) {
    return selector === ":popover-open" ? true : matches.call(this, selector);
  });
  const click = vi.fn(); start.onclick = click;
  render(React.createElement(HandCursor));
  const send = (x: number, y: number, pinch = false) => state.send({
    point: { x: x / innerWidth, y: y / innerHeight }, pinch,
    fist: false, palm: false, tilt: 0, palmSize: .1, motionPoint: { x: 0, y: 0 }, gesture: "",
  });
  return { start, click, send };
}
it("retains Start aim during finger closure and fires only once per pinch", () => {
  const { start, click, send } = setup();
  send(400, 430);
  expect(start.classList.contains("gesture-target")).toBe(true);
  send(590, 430, true);
  send(590, 430, true);
  expect(click).toHaveBeenCalledTimes(1);
});
it("rejects distant or stale Start aim", () => {
  const { click, send } = setup();
  send(400, 430); send(750, 430, true);
  expect(click).not.toHaveBeenCalled();
  send(400, 430);
  vi.spyOn(performance, "now").mockReturnValue(performance.now() + 500);
  send(590, 430, true);
  expect(click).not.toHaveBeenCalled();
});
it("ignores buttons behind the modal and clears aim when tracking is lost", () => {
  const { click, send } = setup();
  const behind = document.createElement("button");
  behind.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100 }) as DOMRect;
  const hiddenClick = vi.fn(); behind.onclick = hiddenClick; document.body.append(behind);
  send(50, 50, true);
  expect(hiddenClick).not.toHaveBeenCalled();
  send(400, 430); state.send(null); send(590, 430, true);
  expect(click).not.toHaveBeenCalled();
});
