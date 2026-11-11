type Pt = readonly [number, number];
/**
 * A walkable line through one painted stop, in plate coordinates (0–1).
 * The path runs from the foreground to the farthest point the traveler may
 * reach. vanish is where that path meets the horizon: the camera moves
 * toward it. end is the farthest plate height the feet may reach.
 *
 * Depth follows the "tour into the picture" box: a floor below the
 * horizon, optional side walls and a distant backdrop. walls.l / walls.r
 * give where each wall meets the floor along the bottom edge; walls far
 * outside 0–1 are gentle, open sides.
 */
export interface Route {
  path: readonly Pt[];
  vanish: Pt;
  end: number;
  walls: { l: number; r: number };
  /** Magnification cap at the traveler's feet. */
  maxZoom?: number;
  /** How much the distant backdrop grows by the close view. */
  farZoom?: number;
  /** Preferred screen height of the vanishing point at the start. */
  horizon?: number;
  /** 1 is full perspective parallax; lower values flatten it. */
  depth?: number;
  /**
   * No part of the painting grows more than this factor faster, or slower,
   * than the ground under the traveler. It keeps the sense of depth while
   * standing people, posts and palms are not stretched as they near.
   */
  band?: number;
  /** Extra framing so the camera can pan to an off-centre path. */
  frame?: number;
  /**
   * For a curving walkway: how strongly the camera looks along the path
   * ahead of the traveler (0 keeps one fixed heading). The scenery then
   * expands from where the path is going, so the walk turns with the bend.
   */
  turn?: number;
}
const route = (
  path: Pt[],
  vanish: Pt,
  end: number,
  walls: [number, number],
  extra: Partial<Route> = {},
): Route => ({
  path,
  vanish,
  end,
  walls: { l: walls[0], r: walls[1] },
  ...extra,
});
export const routes: Record<"miami" | "hawaii" | "la", Route[]> = {
  miami: [
    route(
      [
        [0.52, 1],
        [0.525, 0.9],
        [0.53, 0.82],
        [0.535, 0.78],
      ],
      [0.535, 0.72],
      0.785,
      [-0.34, 1.4],
    ),
    // The garden walk passes between the arch pillars and ends at the pool.
    route(
      [
        [0.49, 1],
        [0.49, 0.86],
        [0.49, 0.78],
      ],
      [0.5, 0.62],
      0.785,
      [0.3, 0.7],
    ),
    // Walk down the middle of the beachfront boulevard.
    route(
      [
        [0.5, 1],
        [0.505, 0.85],
        [0.51, 0.72],
        [0.51, 0.68],
      ],
      [0.51, 0.635],
      0.7,
      [-0.1, 1.6],
    ),
    route(
      [
        [0.55, 1],
        [0.535, 0.85],
        [0.525, 0.76],
        [0.52, 0.72],
      ],
      [0.515, 0.712],
      0.74,
      [-0.14, 1.14],
      // The walk ends very close to the horizon here, so the camera's
      // magnification climbs fast; a lower limit keeps the close view sharp.
      { maxZoom: 1.6 },
    ),
  ],
  hawaii: [
    // The temple walkway stops at the pond. A higher horizon starts the
    // walk further back, so the approach to the water is longer.
    route(
      [
        [0.53, 1],
        [0.54, 0.88],
        [0.55, 0.79],
      ],
      [0.55, 0.6],
      0.79,
      [-0.6, 1.6],
      { horizon: 0.38 },
    ),
    // The cliff path bends left, then climbs right toward the lighthouse;
    // the camera turns with it.
    route(
      [
        [0.31, 1],
        [0.26, 0.85],
        [0.23, 0.72],
        [0.235, 0.6],
        [0.26, 0.52],
        [0.3, 0.47],
        [0.36, 0.44],
      ],
      [0.3, 0.4],
      0.47,
      [0.08, 1.6],
      { horizon: 0.5, frame: 1.15, turn: 0.75 },
    ),
    route(
      [
        [0.42, 1],
        [0.39, 0.85],
        [0.365, 0.72],
        [0.355, 0.65],
      ],
      [0.35, 0.585],
      0.65,
      [-0.01, 1.6],
    ),
    route(
      [
        [0.52, 1],
        [0.525, 0.85],
        [0.53, 0.72],
        [0.53, 0.69],
      ],
      [0.53, 0.64],
      0.69,
      [-0.2, 1.25],
    ),
  ],
  la: [
    // Keep the Hollywood sign in view: a short approach and a low horizon.
    route(
      [
        [0.52, 1],
        [0.56, 0.88],
        [0.6, 0.76],
        [0.615, 0.71],
      ],
      [0.62, 0.68],
      0.715,
      [-0.6, 1.15],
      {
        maxZoom: 1.7,
        farZoom: 1.3,
        horizon: 0.78,
      },
    ),
    // Venice: skate down the middle of the bike lane, between the yellow
    // centre line and the edge line. Its painted skater has been cleared.
    route(
      [
        [0.335, 1],
        [0.381, 0.85],
        [0.44, 0.7],
        [0.454, 0.665],
      ],
      [0.5, 0.53],
      0.665,
      [-0.9, 1.6],
    ),
    route(
      [
        [0.5, 1],
        [0.5, 0.85],
        [0.51, 0.72],
        [0.51, 0.665],
      ],
      [0.51, 0.6],
      0.665,
      [0.014, 1.07],
    ),
    route(
      [
        [0.36, 1],
        [0.37, 0.8],
        [0.385, 0.65],
        [0.39, 0.58],
      ],
      [0.4, 0.5],
      0.58,
      [-0.225, 1.1],
    ),
  ],
};

/**
 * Where the path ahead of the feet points on the horizon: the chord to a
 * point a short way along it, extended to the vanishing height. Using a
 * chord rather than the local tangent turns smoothly through each bend.
 */
export function headingU(r: Route, feet: { u: number; v: number }) {
  const [fu, fv] = r.vanish;
  const aheadV = Math.max(r.path[r.path.length - 1][1], feet.v - 0.14);
  if (feet.v - aheadV < 0.02) return fu;
  const aheadU = pathU(r.path, aheadV);
  const u = feet.u + ((aheadU - feet.u) * (feet.v - fv)) / (feet.v - aheadV);
  return Math.max(fu - 0.3, Math.min(fu + 0.3, u));
}

/** Horizontal position of the path at plate height v. */
export function pathU(path: readonly Pt[], v: number) {
  if (v >= path[0][1]) return path[0][0];
  for (let i = 1; i < path.length; i++) {
    const [u0, v0] = path[i - 1],
      [u1, v1] = path[i];
    if (v >= v1) return u0 + ((u1 - u0) * (v0 - v)) / (v0 - v1 || 1);
  }
  return path[path.length - 1][0];
}

/**
 * Nearness (inverse depth) of a plate point. The floor's is its height
 * below the horizon. Each wall is a plane through the vanishing point, so
 * straight edges stay straight as the camera moves.
 */
/** A max with a rounded corner, so the floor eases into the walls without a fold. */
export function smoothMax(a: number, b: number, k: number) {
  return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2;
}
const crease = 0.05;
export function boxDisparity(r: Route, u: number, v: number) {
  const [fu, fv] = r.vanish,
    { l, r: right } = r.walls;
  return smoothMax(
    smoothMax(v - fv, ((1 - fv) / Math.max(1e-3, fu - l)) * (fu - u), crease),
    ((1 - fv) / Math.max(1e-3, right - fu)) * (u - fu),
    crease,
  );
}

const nearest = 40;
/** Forward camera travel: a point with nearness δ grows by 1 / (1 − travel·δ). */
export function magnify(disparity: number, travel: number) {
  const gap = 1 - travel * disparity;
  return gap <= 1 / nearest ? nearest : 1 / gap;
}

export interface CameraFrame {
  /** Plate size on screen before any travel. */
  width: number;
  height: number;
  /** Screen position of the vanishing point. */
  ex: number;
  ey: number;
  /** Plate u of the heading the camera moves toward (the route's vanish when straight). */
  fx: number;
  travel: number;
  /** Nearness of the distant backdrop: sky and landmark move together. */
  far: number;
  /** Parallax is softened toward this nearness by the route's depth. */
  ref: number;
  depth: number;
  feet: { u: number; v: number };
  /** Magnification at the feet, and the band every vertex stays within. */
  feetZoom: number;
  band: number;
  lane: number;
}
/** Nearness used for rendering, after the backdrop floor and softening. */
export function effective(raw: number, cam: CameraFrame) {
  return smoothMax(cam.far, cam.ref + (raw - cam.ref) * cam.depth, crease);
}
/**
 * Magnification of a plate point with raw nearness δ. Relative to the ground
 * under the feet it is compressed smoothly (tanh in log space): true
 * perspective near the traveler, easing toward the band for very near or far
 * scenery. A hard clamp would leave flat cards sliding over each other.
 */
export function zoomOf(raw: number, cam: CameraFrame) {
  const k = magnify(effective(raw, cam), cam.travel);
  const limit = Math.log(cam.band);
  return (
    cam.feetZoom *
    Math.exp(limit * Math.tanh(Math.log(k / cam.feetZoom) / limit))
  );
}

/**
 * Follow-camera for one stop. The traveler's feet stay at screen height
 * ground while the camera walks toward the vanishing point. The path
 * point under the feet is solved each frame with the same depth used to
 * draw the plate, so the traveler always stands on the painted walkway.
 */
export function cameraAt(
  r: Route,
  t: number,
  view: { w: number; h: number; ground: number },
  plate: { w: number; h: number },
): CameraFrame {
  const { w, h, ground } = view;
  const scale = Math.max(w / plate.w, h / plate.h) * (r.frame ?? 1.04);
  const bw = plate.w * scale,
    bh = plate.h * scale;
  const [fu, fv] = r.vanish;
  const ey = Math.max(
    h - (1 - fv) * bh,
    Math.min(fv * bh, h * (r.horizon ?? 0.56)),
  );
  const startV = Math.min(1, fv + (ground - ey) / bh);
  const endV = Math.min(startV - 0.01, r.end);
  const ref = Math.max(0.01, boxDisparity(r, pathU(r.path, endV), endV));
  const reach = Math.min(
    r.maxZoom ?? 2.4,
    (ground - ey) / Math.max(1e-3, (endV - fv) * bh),
  );
  const travelEnd = Math.max(0, (1 - 1 / reach) / ref);
  const cam: CameraFrame = {
    width: bw,
    height: bh,
    ex: 0,
    ey,
    fx: fu,
    travel: travelEnd * Math.max(0, Math.min(1, t)),
    far: Math.min(
      ref * 0.8,
      (1 - 1 / (r.farZoom ?? 1.8)) / Math.max(1e-3, travelEnd),
    ),
    ref,
    depth: r.depth ?? 0.6,
    feet: { u: pathU(r.path, startV), v: startV },
    feetZoom: 1,
    band: r.band ?? 1.35,
    lane: 0,
  };
  const zoomAt = (u: number, v: number) =>
    magnify(effective(boxDisparity(r, u, v), cam), cam.travel);
  if (cam.travel > 0) {
    // The path's screen height rises as v nears the horizon: bisect for the feet.
    let lo = fv + 0.004,
      hi = startV;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (ey + (mid - fv) * bh * zoomAt(pathU(r.path, mid), mid) > ground)
        hi = mid;
      else lo = mid;
    }
    const v = (lo + hi) / 2;
    cam.feet = { u: pathU(r.path, v), v };
  }
  cam.feetZoom = zoomAt(cam.feet.u, cam.feet.v);
  if (r.turn) cam.fx = fu + (headingU(r, cam.feet) - fu) * r.turn;
  const offset = (cam.feet.u - cam.fx) * bw * cam.feetZoom;
  // Look toward the landmark, but pan to keep the traveler near the middle.
  const preferred = Math.max(0.36 * w, Math.min(0.64 * w, w / 2 + offset));
  // Keep the painting's edges off screen. On a turning walk the edges are
  // magnified too, so the camera may pan further toward the bend.
  let left = 1,
    right = 1;
  if (r.turn) {
    left = right = Infinity;
    for (let i = 0; i <= 8; i++) {
      const v = i / 8;
      left = Math.min(left, zoomOf(boxDisparity(r, 0, v), cam));
      right = Math.min(right, zoomOf(boxDisparity(r, 1, v), cam));
    }
  }
  cam.ex = Math.max(
    w - (1 - cam.fx) * bw * right,
    Math.min(cam.fx * bw * left, preferred - offset),
  );
  cam.lane = cam.ex + offset;
  return cam;
}

// Project the illustrated terrain away from a fixed vanishing point. Foreground
// pixels cover more screen distance per pace than distant architecture.
export function approachProgress(progress: number) {
  return Math.max(0, Math.min(1, progress / (1 + overlap)));
}
export function projection(depth: number, progress: number, reach = 3) {
  // Most approach comes from a coherent camera move. Keep depth deformation
  // gentle so doorways and façades retain their shape in the close view.
  return 1 + approachProgress(progress) * (reach - 1 + 0.18 * depth);
}

export const secondsPerLandmark = 8;

// Stop if inference stops reporting fresh hands, even if the video track
// itself has not ended. This is the same speed in either direction.
export function steeringDistance(axis: number, frameAge: number, dt: number) {
  return frameAge > 250 ? 0 : (axis * dt) / secondsPerLandmark;
}

// One cycle is the eight-frame walk sheet. Long gestures can cover more
// ground with a light, brisk walking cadence.
export function advanceStride(cycle: number, displacement: number, dt: number) {
  const step = Math.min(Math.abs(displacement) * 10, dt * 1.2);
  return (cycle + Math.sign(displacement) * step + 1) % 1;
}
const overlap = 0.18;
export function viewAt(distance: number, count: number) {
  const section = Math.min(count - 1, Math.floor(distance));
  const local = distance - section;
  const incoming = section < count - 1 && local > 1 - overlap;
  const fade = incoming ? (local - (1 - overlap)) / overlap : 0;
  // The incoming view is already moving throughout the overlap. Its
  // perspective and stride carry on across the integer boundary.
  return {
    section,
    local,
    next: incoming ? section + 1 : section,
    blend: fade * fade * (3 - 2 * fade),
    progress: local + (section > 0 ? overlap : 0),
    nextProgress: Math.max(0, local - 1 + overlap),
  };
}
