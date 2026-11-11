import { expect, it } from "vitest";
import {
  boxDisparity,
  cameraAt,
  pathU,
  routes,
  zoomOf,
} from "../src/travel/movement";

const views = [
  { w: 940, h: 430 },
  { w: 390, h: 300 },
  { w: 1400, h: 640 },
];
const plate = { w: 1440, h: 810 };
const stops = Object.entries(routes).flatMap(([city, list]) =>
  list.map((r, i) => [city + " " + i, r] as const),
);

it.each(stops)("%s keeps the traveler's feet on the painted path", (_, r) => {
  for (const { w, h } of views) {
    const view = { w, h, ground: h * 0.955 };
    let lastV = Infinity;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const cam = cameraAt(r, t, view, plate);
      // The feet lie on the authored walkway, never beyond its end.
      expect(cam.feet.u).toBeCloseTo(pathU(r.path, cam.feet.v), 6);
      expect(cam.feet.v).toBeGreaterThanOrEqual(r.end - 0.02);
      expect(cam.feet.v).toBeLessThanOrEqual(lastV + 1e-9);
      lastV = cam.feet.v;
      // Drawn with the same mesh mapping, that path point is under the feet.
      const k = zoomOf(boxDisparity(r, cam.feet.u, cam.feet.v), cam);
      const y = cam.ey + (cam.feet.v - r.vanish[1]) * cam.height * k;
      const x = cam.ex + (cam.feet.u - cam.fx) * cam.width * k;
      expect(Math.abs(y - view.ground)).toBeLessThan(1);
      expect(x).toBeCloseTo(cam.lane, 6);
      expect(cam.lane).toBeGreaterThan(0);
      expect(cam.lane).toBeLessThan(w);
    }
  }
});

it.each(stops)(
  "%s moves near scenery faster than the distant landmark",
  (_, r) => {
    const cam = cameraAt(r, 0.7, { w: 940, h: 430, ground: 410 }, plate);
    const near = zoomOf(boxDisparity(r, r.vanish[0], 1), cam);
    const far = zoomOf(boxDisparity(r, r.vanish[0], 0.1), cam);
    expect(near).toBeGreaterThan(far * 1.2);
    expect(far).toBeGreaterThan(1);
    // Nothing stretches beyond the band around the traveler's ground.
    expect(near / cam.feetZoom).toBeLessThanOrEqual(cam.band + 1e-9);
    expect(cam.feetZoom / far).toBeLessThanOrEqual(cam.band + 1e-9);
  },
);
