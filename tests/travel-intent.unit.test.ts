import { expect, it } from "vitest";
import { HandSteering } from "../src/travel/push";
import { advanceStride, steeringDistance } from "../src/travel/movement";

function steering() {
  const control = new HandSteering();
  let now = 0;
  const frame = (span: number | null, ms = 60, center = 0.5) =>
    control.sample(
      span === null
        ? []
        : [
            { x: center - span / 2, y: 0.5 },
            { x: center + span / 2, y: 0.5 },
          ],
      (now += ms),
      0.1,
    );
  for (let i = 0; i < 8; i++) frame(0.43);
  return { control, frame };
}

it("calibrates a comfortable starting position without moving", () => {
  const c = new HandSteering();
  for (let now = 0; now < 350; now += 60)
    expect(
      c.sample(
        [
          { x: 0.28, y: 0.5 },
          { x: 0.72, y: 0.5 },
        ],
        now,
      ),
    ).toBe(0);
  expect(c.cue).toBe("calibrate");
  expect(
    c.sample(
      [
        { x: 0.28, y: 0.5 },
        { x: 0.72, y: 0.5 },
      ],
      400,
    ),
  ).toBe(0);
  expect(c.cue).toBe("rest");
});

it("gives mirrored hand positions identical forward and backward speed", () => {
  for (const displacement of [0.07, 0.1, 0.16, 0.23]) {
    const forward = steering(),
      back = steering();
    for (let i = 0; i < 8; i++) {
      const f = forward.frame(0.43 + displacement),
        b = back.frame(0.43 - displacement);
      expect(f).toBeCloseTo(-b, 8);
      expect(f).toBeLessThanOrEqual(1);
    }
    expect(forward.control.cue).toBe("forward");
    expect(back.control.cue).toBe("back");
  }
});

it("moves while held, stops at center, and treats returning to center as a pause", () => {
  const r = steering();
  for (let i = 0; i < 10; i++) r.frame(0.64);
  expect(r.control.axis).toBe(1);
  for (let i = 0; i < 10; i++) expect(r.frame(0.43)).toBeGreaterThanOrEqual(0);
  expect(r.control.cue).toBe("rest");
  expect(r.control.axis).toBe(0);
  for (let i = 0; i < 10; i++) r.frame(0.22);
  expect(r.control.axis).toBe(-1);
});

it("rejects resting tremor and shared horizontal translation", () => {
  const r = steering();
  for (let i = 0; i < 60; i++)
    expect(
      r.frame(0.43 + 0.018 * Math.sin(i), 60, 0.4 + 0.03 * Math.sin(i)),
    ).toBe(0);
});

it("stops on one lost hand and recalibrates after a long absence", () => {
  const r = steering();
  for (let i = 0; i < 10; i++) r.frame(0.64);
  expect(r.frame(null)).toBe(0);
  expect(r.control.cue).toBe("find");
  expect(r.frame(0.64, 1100)).toBe(0);
  for (let i = 0; i < 8; i++) r.frame(0.64);
  expect(r.control.cue).toBe("rest");
});

it("allows resetting the neutral position without altering world distance", () => {
  const r = steering();
  r.frame(0.7);
  r.control.reset();
  for (let i = 0; i < 8; i++) expect(r.frame(0.58)).toBe(0);
  expect(r.control.cue).toBe("rest");
});

it("travels a full approach in 8 seconds in either direction and stops stale input", () => {
  for (const sign of [-1, 1]) {
    let distance = 0;
    for (let i = 0; i < 160; i++) distance += steeringDistance(sign, 50, 0.05);
    expect(distance).toBeCloseTo(sign, 8);
  }
  expect(steeringDistance(1, 251, 0.05)).toBe(0);
  expect(steeringDistance(-1, 251, 0.05)).toBe(0);
});

it("caps brisk walking at 1.2 cycles per second and freezes on rest", () => {
  expect(advanceStride(0.2, 0.13, 0.08)).toBeCloseTo(0.296);
  expect(advanceStride(0.2, -0.13, 0.08)).toBeCloseTo(0.104);
  expect(advanceStride(0.75, 0, 0.08)).toBe(0.75);
});
