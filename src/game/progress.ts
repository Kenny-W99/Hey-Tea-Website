import type { Point } from "../camera/gestures";
import type { Mechanic } from "./catalog";
import {
  PrepStrokes,
  strokeCount,
  actionCount,
  pourSeconds,
  isPeel,
  peelReach,
} from "./strokes";
export const clamp = (n: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, n));
export function buttonIncrement(mode: Mechanic) {
  return 1 / (actionCount(mode) || 4);
}
export function signedArc(
  prev: Point,
  current: Point,
  center: Point = { x: 0.5, y: 0.51 },
) {
  const a = { x: prev.x - center.x, y: prev.y - center.y },
    b = { x: current.x - center.x, y: current.y - center.y };
  if (
    [a, b].some(
      (p) => Math.hypot(p.x, p.y) < 0.1 || Math.hypot(p.x, p.y) > 0.48,
    )
  )
    return 0;
  const angle = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
  return Math.abs(angle) > 0.9 ? 0 : angle;
}
export type Input =
  | { type: "start" | "drag" | "end"; point: Point }
  | { type: "tick"; seconds: number }
  | { type: "accessible" };
export class FruitController {
  private last?: Point;
  private origin?: Point;
  private angle = 0;
  private peak = 0;
  private prep: PrepStrokes | null;
  constructor(readonly mode: Mechanic) {
    this.prep = strokeCount(mode) ? new PrepStrokes(mode, 0.21) : null;
  }
  cancel() {
    this.prep?.reset();
    this.last = undefined;
    this.origin = undefined;
    this.angle = 0;
    this.peak = 0;
  }
  input(action: Input): number {
    const mode = this.mode;
    if (action.type === "accessible") return buttonIncrement(mode);
    if (action.type === "tick")
      return this.last && mode === "pour"
        ? clamp(action.seconds, 0, 0.12) / pourSeconds
        : 0;
    if (action.type === "start") {
      if (this.last) return 0;
      this.last = action.point;
      this.origin = action.point;
      this.prep?.sample(action.point);
      this.angle = 0;
      this.peak = 0;
      return mode === "mash" ? buttonIncrement(mode) : 0;
    }
    if (!this.last || !this.origin) return 0;
    if (action.type === "end") {
      const delivered =
        action.point.y > 0.64 && action.point.y - this.origin.y > 0.12;
      this.cancel();
      if (mode === "squeeze") return buttonIncrement(mode);
      return (mode === "transfer" || mode === "scoop") && delivered
        ? buttonIncrement(mode)
        : 0;
    }
    const previous = this.last;
    this.last = action.point;
    // Measure furthest displacement per stroke so back-and-forth jitter cannot earn distance.
    let measured = 0;
    if (this.prep) return this.prep.sample(action.point);
    // The skin follows the finger: only downward travel peels, and it never re-attaches.
    if (isPeel(mode))
      return Math.max(0, action.point.y - previous.y) / peelReach.pointer;
    if (mode === "stir") {
      this.angle += signedArc(previous, action.point);
      // A quarter-turn establishes intent. Jitter that reverses direction cannot accrue.
      measured =
        mode === "stir" && Math.abs(this.angle) < Math.PI / 2
          ? 0
          : Math.abs(this.angle) / (actionCount(mode) * 2 * Math.PI);
    }
    const gain = Math.max(0, measured - this.peak);
    this.peak = Math.max(this.peak, measured);
    return gain;
  }
}
