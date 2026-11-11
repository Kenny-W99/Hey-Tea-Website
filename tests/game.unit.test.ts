import { expect, it } from "vitest";
import { FruitController, signedArc } from "../src/game/progress";
import { preparedFruits, recipes } from "../src/game/catalog";
import { projection, viewAt } from "../src/travel/movement";
const point = { x: 0.3, y: 0.4 };
it("requires deliberate angular movement and rejects jumps or a stationary fingertip", () => {
  const ctl = new FruitController("stir");
  let earned = 0;
  ctl.input({ type: "start", point: { x: 0.8, y: 0.51 } });
  for (let i = 1; i <= 120; i++) {
    const a = (i * Math.PI) / 30;
    earned += ctl.input({
      type: "drag",
      point: { x: 0.5 + 0.3 * Math.cos(a), y: 0.51 + 0.3 * Math.sin(a) },
    });
    if (i === 60) expect(earned).toBeCloseTo(0.5);
  }
  expect(earned).toBeCloseTo(1);
  expect(signedArc(point, point)).toBe(0);
  expect(signedArc({ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 })).toBe(0);
});
it("counts a single stroke and pauses a pour when released", () => {
  const mash = new FruitController("mash");
  expect(mash.input({ type: "start", point })).toBeCloseTo(1 / 3);
  expect(mash.input({ type: "start", point })).toBe(0);
  const pour = new FruitController("pour");
  pour.input({ type: "start", point });
  expect(pour.input({ type: "tick", seconds: 0.1 })).toBeGreaterThan(0);
  pour.input({ type: "end", point });
  expect(pour.input({ type: "tick", seconds: 0.1 })).toBe(0);
});
it("requires dropping prepared fruit into the lower target and releases on loss", () => {
  const ctl = new FruitController("transfer");
  ctl.input({ type: "start", point });
  expect(ctl.input({ type: "end", point })).toBe(0);
  ctl.input({ type: "start", point });
  ctl.cancel();
  expect(ctl.input({ type: "end", point: { x: 0.5, y: 0.8 } })).toBe(0);
  ctl.input({ type: "start", point });
  expect(ctl.input({ type: "end", point: { x: 0.5, y: 0.8 } })).toBe(1);
});
it("adds every fruit cut or peeled earlier, one drop each", () => {
  const added = Object.values(recipes).map((r) =>
    preparedFruits(
      r.steps,
      r.steps.findIndex((s) => s.mode === "transfer"),
    ).map((f) => f.fruit + (f.peeled ? " peeled" : " cut")),
  );
  expect(added).toEqual([
    ["guava cut", "lime cut"],
    ["pineapple peeled", "lilikoi cut"],
    ["prickly-pear peeled", "orange peeled"],
  ]);
  const ctl = new FruitController("transfer", 3);
  const drop = () => {
    ctl.input({ type: "start", point });
    return ctl.input({ type: "end", point: { x: 0.5, y: 0.8 } });
  };
  expect([drop(), drop(), drop()]).toEqual([1 / 3, 1 / 3, 1 / 3]);
  expect(ctl.input({ type: "accessible" })).toBeCloseTo(1 / 3);
});
it("peels as far as the finger pulls down and never re-attaches the skin", () => {
  const ctl = new FruitController("peel");
  ctl.input({ type: "start", point: { x: 0.5, y: 0.1 } });
  expect(ctl.input({ type: "drag", point: { x: 0.5, y: 0.45 } })).toBeCloseTo(
    0.5,
  );
  expect(ctl.input({ type: "drag", point: { x: 0.5, y: 0.3 } })).toBe(0);
  expect(ctl.input({ type: "drag", point: { x: 0.5, y: 0.65 } })).toBeCloseTo(
    0.5,
  );
});
it("keeps the foreground moving faster than the horizon throughout the walk", () => {
  expect(projection(1, 0)).toBe(1);
  for (let i = 0.1; i <= 1.1; i += 0.1) {
    expect(projection(1, i)).toBeGreaterThan(projection(0, i));
    expect(projection(0, i)).toBeGreaterThan(projection(0, i - 0.1));
  }
});

it("reaches a landmark close view before transitioning", () => {
  expect(viewAt(0.8, 4).blend).toBe(0);
  expect(viewAt(0.83, 4).blend).toBeGreaterThan(0);
  expect(projection(0, viewAt(0.8, 4).progress, 3.5)).toBeGreaterThan(2.6);
});

it("preserves both approach scale and the next landmark across the seam", () => {
  const before = viewAt(0.99999, 4),
    after = viewAt(1, 4);
  expect(before.next).toBe(after.section);
  expect(before.blend).toBeGreaterThan(0.999);
  expect(before.nextProgress).toBeCloseTo(after.progress, 4);
});
