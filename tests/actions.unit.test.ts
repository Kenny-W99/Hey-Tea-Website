import { expect, it } from "vitest";
import type { Hand } from "../src/camera/gestures";
import { ActionGestures, holdMs, settleMs } from "../src/travel/actions";

const sign = (gesture: string): Hand => ({
  point: { x: 0.5, y: 0.5 },
  motionPoint: { x: 0.5, y: 0.5 },
  pinch: false,
  fist: gesture === "Closed_Fist",
  palm: gesture === "Open_Palm",
  tilt: 0,
  palmSize: 0.1,
  gesture,
});

it.each([
  ["Closed_Fist", "sit"],
  ["Thumb_Up", "sip"],
  ["Open_Palm", "wave"],
  ["Victory", "selfie"],
] as const)("a held %s asks the traveler to %s once", (gesture, action) => {
  const signs = new ActionGestures();
  expect(signs.sample(sign(gesture), 0)).toBeNull();
  expect(signs.sample(sign(gesture), holdMs - 50)).toBeNull();
  expect(signs.sample(sign(gesture), holdMs + 10)).toBe(action);
  // Holding longer never repeats it.
  expect(signs.sample(sign(gesture), holdMs * 3)).toBeNull();
});

it("needs the sign to change before repeating, and ignores unmapped signs", () => {
  const signs = new ActionGestures();
  signs.sample(sign("Thumb_Up"), 0);
  expect(signs.sample(sign("Thumb_Up"), 700)).toBe("sip");
  signs.sample(sign(""), 800);
  signs.sample(sign("Thumb_Up"), 900);
  expect(signs.sample(sign("Thumb_Up"), 900 + holdMs)).toBe("sip");
  signs.sample(sign("Pointing_Up"), 2000);
  expect(signs.sample(sign("Pointing_Up"), 3000)).toBeNull();
  expect(signs.sample(null, 3100)).toBeNull();
});

it("waits after two-hand steering, so lowering one hand never waves by accident", () => {
  const signs = new ActionGestures();
  signs.steering(0);
  // The steering palm left in view stays ignored however long it is held.
  for (let now = 10; now < 4000; now += 100)
    expect(signs.sample(sign("Open_Palm"), now)).toBeNull();
  // Changing sign, or raising the hand afresh, arms it again.
  signs.sample(sign("Thumb_Up"), 4000);
  expect(signs.sample(sign("Thumb_Up"), 4000 + holdMs)).toBe("sip");
  signs.steering(5000);
  signs.sample(null, 5100);
  signs.sample(sign("Open_Palm"), 5200);
  expect(signs.sample(sign("Open_Palm"), 5200 + holdMs)).toBeNull();
  expect(signs.sample(sign("Open_Palm"), 5000 + settleMs + holdMs)).toBe(
    "wave",
  );
  // A deliberate sign straight after steering waits only for the quiet time.
  signs.steering(8000);
  signs.sample(sign("Closed_Fist"), 8050);
  expect(signs.sample(sign("Closed_Fist"), 8000 + settleMs + 10)).toBe("sit");
});
