import { readFileSync, existsSync } from "node:fs";
import { expect, it } from "vitest";
import { recipes, type City } from "../src/game/catalog";
import { initial, reduceRun, restore } from "../src/game/run";
import { FruitController } from "../src/game/progress";
import { GestureFilter } from "../src/camera/gestures";
it.each(Object.keys(recipes) as City[])(
  "binds recipe, playable actions, cup and all landmark triggers for %s",
  (city) => {
    let run = reduceRun(reduceRun(initial, { type: "enter" }), {
      type: "select",
      city,
    });
    for (const step of recipes[city].steps) {
      const ctl = new FruitController(step.mode);
      expect(reduceRun(run, { type: "next" })).toBe(run);
      while (run.progress < 1)
        run = reduceRun(run, {
          type: "advance",
          delta: ctl.input({ type: "accessible" }),
        });
      run = reduceRun(run, { type: "next" });
    }
    expect(run.scene).toBe("reveal");
    run = reduceRun(run, { type: "explore" });
    for (let i = 0; i < 4; i++) {
      run = reduceRun(run, { type: "walk", distance: i + 1 });
      expect(restore(JSON.stringify(run))).toEqual(run);
    }
    run = reduceRun(run, { type: "finish" });
    expect(run.city).toBe(city);
    expect(run.scene).toBe("final");
    expect(reduceRun(run, { type: "replay" })).toEqual({
      ...initial,
      scene: "choose",
    });
  },
);
it("converts a stable hand action to a game stroke while preserving prior progress on loss", () => {
  const f = new GestureFilter(),
    ctl = new FruitController("split");
  const points = Array.from({ length: 21 }, () => ({ x: 0.6, y: 0.45 }));
  points[17] = { x: 0.4, y: 0.45 };
  f.update({ points }, 0);
  const hand = f.update({ points }, 100)!;
  expect(hand.pinch).toBe(true);
  ctl.input({ type: "start", point: hand.point });
  points[8] = { x: 0.23, y: 0.45 };
  points[4] = points[8];
  const drag = f.update({ points }, 170)!;
  const delta = ctl.input({ type: "drag", point: drag.point });
  const run = reduceRun(
    { ...initial, scene: "station" },
    { type: "advance", delta },
  );
  expect(run.progress).toBeGreaterThan(0);
  f.update({ points: [] }, 250);
  ctl.cancel();
  expect(restore(JSON.stringify(run)).progress).toBe(run.progress);
});
it("validates versioned storage and all manifest targets", () => {
  expect(restore("{")).toEqual(initial);
  expect(restore(JSON.stringify({ ...initial, step: -2 }))).toEqual(initial);
  const manifest = JSON.parse(
    readFileSync("public/art/manifest.json", "utf8"),
  ) as { path: string; page: number; size: number[] }[];
  expect(manifest.length).toBeGreaterThan(90);
  for (const row of manifest) {
    expect(existsSync("public" + row.path)).toBe(true);
    expect(row.page).toBeGreaterThan(0);
    expect(row.size[0]).toBeGreaterThan(0);
  }
});

it("leaves an unfinished walk and permits choosing another drink", () => {
  const run = reduceRun(
    { ...initial, scene: "explore", distance: 1.8 },
    { type: "leave" },
  );
  expect(run.scene).toBe("choose");
  expect(run.distance).toBe(0);
  const next = reduceRun(run, { type: "select", city: "hawaii" });
  expect(next.scene).toBe("station");
  expect(next.city).toBe("hawaii");
});

it("completes the final fraction of a route without requiring a perfect endpoint", () => {
  const atEnd = reduceRun(
    { ...initial, scene: "explore" },
    { type: "walk", distance: 3.99 },
  );
  expect(atEnd.distance).toBe(4);
  expect(reduceRun(atEnd, { type: "finish" }).scene).toBe("final");
  expect(reduceRun(atEnd, { type: "walk", distance: 3.99 }).distance).toBe(
    3.99,
  );
});
