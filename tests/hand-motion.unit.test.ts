import { it, expect } from "vitest";
import type { Hand } from "../src/camera/gestures";
import { KitchenMotion } from "../src/game/handMotion";
import { initial, reduceRun, restore } from "../src/game/run";

const hand = (x = 0.2, y = 0.3, palmSize = 0.1): Hand => ({
  point: { x, y },
  motionPoint: { x, y },
  pinch: false,
  fist: false,
  palm: false,
  tilt: 0,
  palmSize,
  gesture: "",
});

it.each(["split", "scoop", "transfer"] as const)(
  "%s accepts a single unclassified stroke outside the artwork and ignores tremor",
  (mode) => {
    const ctl = new KitchenMotion(mode);
    expect(ctl.sample(hand(0.2, 0.3), 0)).toBe(0);
    expect(ctl.sample(hand(0.21, 0.309), 70)).toBe(0);
    const end = mode === "split" ? hand(0.02, 0.31) : hand(0.21, 0.51);
    // One sweep cuts half the fruit; one drag delivers the whole portion.
    expect(ctl.sample(end, 140)).toBe(mode === "split" ? 0.25 : 1);
    expect(ctl.sample(end, 210)).toBe(0);
  },
);

it.each(["peel", "arc"] as const)(
  "%s follows a continuous downward pull and ignores tremor, lifts and jumps",
  (mode) => {
    const ctl = new KitchenMotion(mode);
    expect(ctl.sample(hand(0.2, 0.2), 0)).toBe(0);
    expect(ctl.sample(hand(0.2, 0.202), 70)).toBe(0);
    let total = 0;
    for (let i = 1; i <= 9; i++)
      total += ctl.sample(hand(0.2, 0.202 + i * 0.05), 70 + i * 70);
    expect(total).toBeCloseTo(1);
    expect(ctl.sample(hand(0.2, 0.3), 770)).toBe(0);
    expect(ctl.sample(hand(0.2, 0.5), 840)).toBe(0);
  },
);

it("ignores a tracking jump and pauses a tilted pour the moment the hand disappears", () => {
  const cut = new KitchenMotion("split");
  cut.sample(hand(), 0);
  cut.sample(null, 70);
  expect(cut.sample(hand(0.6, 0.7), 140)).toBe(0);
  const pour = new KitchenMotion("pour");
  const tilted = { ...hand(), tilt: 0.7 };
  pour.sample(tilted, 0);
  pour.sample(tilted, 70);
  expect(pour.sample(tilted, 140)).toBeGreaterThan(0);
  expect(pour.sample(null, 210)).toBe(0);
  expect(pour.sample(tilted, 280)).toBe(0);
  expect(pour.sample({ ...tilted, tilt: 0 }, 350)).toBe(0);
});

it.each(["mash", "scoop", "transfer"] as const)(
  "rearms %s only after a lift, and separates deliberate portions from rapid oscillations",
  (mode) => {
    const ctl = new KitchenMotion(mode);
    ctl.sample(hand(), 0);
    const gain = mode === "mash" ? 1 / 3 : 1;
    expect(ctl.sample(hand(0.2, 0.51), 70)).toBe(gain);
    expect(ctl.sample(hand(0.2, 0.54), 140)).toBe(0);
    ctl.sample(hand(0.2, 0.32), 210);
    expect(ctl.sample(hand(0.2, 0.51), 280)).toBe(0);
    ctl.sample(hand(0.2, 0.32), 420);
    ctl.sample(hand(0.2, 0.32), 560);
    expect(ctl.sample(hand(0.2, 0.51), 700)).toBe(gain);
  },
);

it("drops two prepared fruits with two separate sweeps", () => {
  const ctl = new KitchenMotion("transfer", 2);
  ctl.sample(hand(), 0);
  expect(ctl.sample(hand(0.2, 0.51), 70)).toBe(0.5);
  ctl.sample(hand(0.2, 0.32), 700);
  expect(ctl.sample(hand(0.2, 0.51), 770)).toBe(0.5);
});

it.each([-1, 1])(
  "recognizes an off-center loop in direction %i and ignores scrubbing",
  (sign) => {
    const circle = new KitchenMotion("stir");
    let total = 0;
    for (let i = 0; i < 35; i++)
      total += circle.sample(
        hand(0.2 + Math.sin(i * 0.3) * 0.08, 0.65),
        i * 65,
      );
    expect(total).toBe(0);
    for (let i = 0; i <= 28; i++) {
      const a = ((i * Math.PI) / 12) * sign;
      total += circle.sample(
        hand(0.24 + Math.cos(a) * 0.08, 0.64 + Math.sin(a) * 0.1),
        2600 + i * 65,
      );
    }
    // About one of the two turns; progress fills as the hand goes round.
    expect(total).toBeGreaterThan(0.45);
    expect(total).toBeLessThan(0.65);
  },
);

// Deterministic pseudo-random hand motion for the stirring checks.
const random = (seed: number) => () =>
  (seed = (seed * 16807) % 2147483647) / 2147483647;

it("finishes two turns of imperfect, drifting, oval circles with tracking gaps", () => {
  const rnd = random(11);
  for (let k = 0; k < 60; k++) {
    const period = 700 + rnd() * 2600,
      r = 0.05 + rnd() * 0.1,
      ratio = 0.55 + rnd() * 0.45,
      dir = rnd() < 0.5 ? 1 : -1;
    const ctl = new KitchenMotion("stir");
    let total = 0,
      now = 0;
    while (now < 4 * period) {
      now += 55 + rnd() * 70;
      if (rnd() < 0.04) now += 150 + rnd() * 400;
      const a = (dir * 2 * Math.PI * now) / period;
      const p = {
        x: 0.4 + now * 0.00001 + r * Math.cos(a) + (rnd() - 0.5) * 0.01,
        y: 0.5 + r * ratio * Math.sin(a) + (rnd() - 0.5) * 0.01,
      };
      total +=
        rnd() < 0.03 ? ctl.sample(null, now) : ctl.sample(hand(p.x, p.y), now);
    }
    // Four loops of real motion always finish the two required turns.
    expect(total).toBeGreaterThanOrEqual(1 - 1e-9);
  }
});

it("earns no turns from a still, trembling, scrubbing or wandering hand", () => {
  const rnd = random(5);
  const run = (point: (i: number) => [number, number]) => {
    const ctl = new KitchenMotion("stir");
    let total = 0;
    for (let i = 0; i < 160; i++)
      total += ctl.sample(hand(...point(i)), i * 80);
    return total;
  };
  expect(
    run(() => [0.4 + (rnd() - 0.5) * 0.02, 0.5 + (rnd() - 0.5) * 0.02]),
  ).toBe(0);
  expect(
    run((i) => [
      0.4 + Math.sin(i * 0.3) * 0.12,
      0.5 + Math.sin(i * 0.3) * 0.12,
    ]),
  ).toBeLessThan(0.1);
  expect(run((i) => [0.4 + Math.sin(i * 0.25) * 0.15, 0.5])).toBe(0);
  expect(
    run((i) => [0.2 + i * 0.003, 0.5 + Math.sin(i * 0.05) * 0.03]),
  ).toBeLessThan(0.1);
});

it("requires two held-and-released squeezes and never counts a held fist twice", () => {
  const ctl = new KitchenMotion("squeeze");
  let now = 0,
    total = 0;
  const pose = (fist: boolean) => {
    total += ctl.sample({ ...hand(), fist, palm: !fist }, (now += 100));
  };
  pose(false);
  pose(true);
  pose(false);
  expect(total).toBe(0);
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let frame = 0; frame < 8; frame++) pose(true);
    expect(total).toBe(cycle / 2);
    pose(false);
    expect(total).toBe((cycle + 1) / 2);
    pose(false);
  }
});

it("supports a complete down-and-up squeeze without a classified fist", () => {
  const ctl = new KitchenMotion("squeeze");
  ctl.sample(hand(), 0);
  expect(ctl.sample(hand(0.2, 0.48), 100)).toBe(0);
  expect(ctl.sample(hand(0.2, 0.48), 250)).toBe(0);
  expect(ctl.sample(hand(0.2, 0.48), 400)).toBe(0);
  expect(ctl.sample(hand(0.2, 0.3), 500)).toBe(0.5);
  expect(ctl.sample(hand(0.2, 0.3), 600)).toBe(0);
});

it("restores earlier checkpoints, walks back across a landmark and finishes only at the end", () => {
  const run = restore(
    JSON.stringify({
      scene: "explore",
      city: "la",
      step: 5,
      progress: 1,
      stop: 2,
      paces: 1,
      discovered: false,
    }),
  );
  expect(run.distance).toBeCloseTo(2 + 1 / 3);
  expect(reduceRun(run, { type: "finish" })).toBe(run);
  expect(reduceRun(run, { type: "walk", distance: 0.6 }).distance).toBe(0.6);
  expect(
    reduceRun(reduceRun(run, { type: "walk", distance: 5 }), { type: "finish" })
      .scene,
  ).toBe("final");
  expect(reduceRun(initial, { type: "walk", distance: 2 })).toBe(initial);
});
it("requires a new direction for each slice", () => {
  const ctl = new KitchenMotion("split");
  let value = 0;
  for (const [i, x] of [
    0.15, 0.35, 0.52, 0.53, 0.28, 0.15, 0.43, 0.21,
  ].entries())
    value += ctl.sample(hand(x, 0.5), i * 70);
  expect(value).toBeCloseTo(1);
});
it("pours faster at a steeper angle and takes a few seconds even at full tilt", () => {
  const amount = (tilt: number) => {
    const m = new KitchenMotion("pour");
    let gain = 0;
    for (let i = 0; i <= 16; i++) gain += m.sample({ ...hand(), tilt }, i * 65);
    return gain;
  };
  expect(amount(0.65)).toBeGreaterThan(0);
  expect(amount(0.65)).toBeLessThan(amount(1.4));
  expect(amount(1.4)).toBeLessThan(0.4);
});
