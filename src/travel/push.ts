import type { Point } from "../camera/gestures";
import { clamp } from "../game/progress";

export type WalkCue = "find" | "calibrate" | "rest" | "forward" | "back";

// A neutral hand span acts as the center of a two-way joystick. Both
// directions use the same thresholds, response curve and walking speed.
export class HandSteering {
  cue: WalkCue = "find";
  axis = 0;
  private neutral = 0;
  private candidate = 0;
  private since = 0;
  private lastSeen = -Infinity;
  private ready = false;
  private span = 0;
  private reach = 1;

  reset() {
    this.cue = "find";
    this.axis = 0;
    this.ready = false;
    this.lastSeen = -Infinity;
  }

  sample(points: readonly Point[], now: number, palmSize = 0) {
    if (
      points.length !== 2 ||
      !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    ) {
      this.cue = "find";
      this.axis = 0;
      return 0;
    }
    const raw = Math.abs(points[1].x - points[0].x);
    const dt = now - this.lastSeen;
    if (dt > 900 || dt <= 0) this.ready = false;
    if (!this.ready) {
      if (this.cue !== "calibrate" || Math.abs(raw - this.candidate) > 0.025) {
        this.candidate = raw;
        this.since = now;
      }
      this.cue = "calibrate";
      this.axis = 0;
      this.span = raw;
      this.lastSeen = now;
      if (now - this.since < 350) return 0;
      this.neutral = raw;
      this.reach = palmSize > 0 ? clamp(0.5 + 5 * palmSize, 0.8, 1.2) : 1;
      this.ready = true;
      this.cue = "rest";
      return 0;
    }
    this.lastSeen = now;
    this.span += (raw - this.span) * (1 - Math.exp(-Math.min(dt, 100) / 45));
    const offset = (this.span - this.neutral) / this.reach;
    const magnitude = Math.abs(offset);
    const threshold = this.axis === 0 ? 0.055 : 0.04;
    this.axis =
      magnitude <= threshold
        ? 0
        : Math.sign(offset) * clamp((magnitude - 0.04) / 0.1);
    this.cue = this.axis === 0 ? "rest" : this.axis > 0 ? "forward" : "back";
    return this.axis;
  }
}
