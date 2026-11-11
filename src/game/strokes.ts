import type { Mechanic } from "./catalog";
import type { Point } from "../camera/gestures";
export function strokeCount(mode: Mechanic) {
  return mode === "split" ? 4 : 0;
}

/** Peeling follows the pull continuously instead of counting strips. */
export const isPeel = (mode: Mechanic) => mode === "peel" || mode === "arc";
// Downward travel, as a fraction of the input area, that peels the whole skin.
export const peelReach = { pointer: 0.7, camera: 0.45 };

/** `fruits` is how many prepared fruits the bowl step adds, one at a time. */
export function actionCount(mode: Mechanic, fruits = 1) {
  return (
    strokeCount(mode) ||
    (
      {
        squeeze: 2,
        scoop: 1,
        transfer: fruits,
        mash: 3,
        stir: 2,
        pour: 0,
      } as Partial<Record<Mechanic, number>>
    )[mode] ||
    0
  );
}

// A full sweep commits one cut. A longer sweep stays the same cut until
// direction reverses, so four sweeps back and forth open the fruit in stages.
export class PrepStrokes {
  private lo = Infinity;
  private hi = -Infinity;
  private direction = 0;
  constructor(
    private mode: Mechanic,
    private reach: number,
  ) {}
  reset() {
    this.lo = Infinity;
    this.hi = -Infinity;
    this.direction = 0;
  }
  sample(point: Point) {
    const x = point.x;
    this.lo = Math.min(this.lo, x);
    this.hi = Math.max(this.hi, x);
    if (this.direction !== 1 && x - this.lo >= this.reach) {
      this.direction = 1;
      this.hi = this.lo = x;
      return 1 / strokeCount(this.mode);
    }
    if (this.direction !== -1 && this.hi - x >= this.reach) {
      this.direction = -1;
      this.hi = this.lo = x;
      return 1 / strokeCount(this.mode);
    }
    return 0;
  }
}
export const pourSeconds = 3.2;
export function tiltFlow(tilt: number) {
  return Math.max(0.6, Math.min(1, (tilt - 0.3) / 0.9));
}
