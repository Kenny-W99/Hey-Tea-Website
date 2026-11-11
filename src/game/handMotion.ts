import type { Hand, Point } from "../camera/gestures";
import {
  PrepStrokes,
  strokeCount,
  actionCount,
  tiltFlow,
  pourSeconds,
  isPeel,
  peelReach,
} from "./strokes";
import type { Mechanic } from "./catalog";

/** One controller per recipe step. All distances are fractions of the camera frame. */
export class KitchenMotion {
  private prep: PrepStrokes | null;
  flow = 0;
  private previous: Point | null = null;
  private missing = false;
  private lastTime = -Infinity;
  private low = 0;
  private high = 0;
  private pressing = false;
  private closed = false;
  private closedFor = 0;
  private lastAction = -Infinity;
  private pressStarted = 0;
  private pouring = false;
  // Mixing: recent fingertip path, the angle swept around its middle, and
  // the share of that angle already credited.
  private loop: { x: number; y: number; t: number }[] = [];
  private lastAngle: number | null = null;
  private turn = 0;
  private credited = 0;

  constructor(
    private readonly mode: Mechanic,
    private readonly fruits = 1,
  ) {
    this.prep = strokeCount(mode) ? new PrepStrokes(mode, 0.13) : null;
  }

  reset() {
    this.prep?.reset();
    this.flow = 0;
    this.previous = null;
    this.missing = false;
    this.loop = [];
    this.lastAngle = null;
    this.turn = this.credited = 0;
    this.closedFor = 0;
    this.pressing = this.closed = this.pouring = false;
    this.lastTime = -Infinity;
  }

  sample(hand: Hand | null, now: number): number {
    if (!hand) {
      // One missed inference needn't discard a stroke. Never count its time as pouring.
      this.pouring = false;
      this.flow = 0;
      this.missing = true;
      return 0;
    }
    const p = hand.motionPoint;
    if (this.mode === "stir") {
      // A brief tracking gap keeps the circle drawn so far.
      if (now - this.lastTime > 900) this.reset();
      this.lastTime = now;
      this.missing = false;
      return this.stir(p, now);
    }
    const previous = this.previous;
    if (
      now - this.lastTime > 260 ||
      (this.missing &&
        previous &&
        Math.hypot(p.x - previous.x, p.y - previous.y) > 0.09)
    )
      this.reset();
    this.missing = false;
    const dt = Math.min(0.12, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const fresh = this.previous === null;
    const last = this.previous;
    this.previous = p;
    if (this.prep) return this.prep.sample(p);
    if (isPeel(this.mode)) {
      // Continuous pull: tremor and upward recovery never peel.
      const dy = last ? p.y - last.y : 0;
      return dy > 0.004 && dy < 0.12 ? dy / peelReach.camera : 0;
    }
    if (fresh) {
      this.low = this.high = this.mode === "split" ? p.x : p.y;
      this.closed = hand.fist;
      return 0;
    }
    if (this.mode === "pour") {
      const wasPouring = this.pouring;
      this.pouring = hand.tilt > (wasPouring ? 0.36 : 0.55);
      this.flow = this.pouring ? tiltFlow(hand.tilt) : 0;
      return wasPouring && this.pouring ? (dt * this.flow) / pourSeconds : 0;
    }
    if (this.mode === "squeeze" && hand.fist) {
      this.closed = true;
      this.closedFor += dt;
      return 0;
    }
    if (this.mode === "squeeze" && this.closed && hand.palm) {
      this.closed = false;
      this.low = this.high = p.y;
      this.pressing = false;
      const held = this.closedFor >= 0.24;
      this.closedFor = 0;
      return held ? this.commit(now) : 0;
    }
    if (this.mode === "squeeze" && this.closed) return 0;
    const coordinate = p.y;
    this.low = Math.min(this.low, coordinate);
    this.high = Math.max(this.high, coordinate);
    if (this.pressing) {
      if (this.high - coordinate > 0.075) {
        this.pressing = false;
        this.low = this.high = coordinate;
        if (this.mode === "squeeze")
          return now - this.pressStarted >= 240 ? this.commit(now) : 0;
      }
      return 0;
    }
    const excursion = coordinate - this.low;
    if (
      excursion <
      (this.mode === "transfer" || this.mode === "scoop" ? 0.15 : 0.1)
    )
      return 0;
    this.pressing = true;
    this.pressStarted = now;
    this.closed = false;
    this.high = coordinate;
    return this.mode === "squeeze" ? 0 : this.commit(now);
  }

  private commit(now: number) {
    // A held gesture or a fast tracking oscillation cannot dispense several portions.
    if (now - this.lastAction < 600) return 0;
    this.lastAction = now;
    return 1 / actionCount(this.mode, this.fruits);
  }

  /**
   * Count turns by the angle swept around the middle of the last two
   * seconds of motion. Loops need not close exactly, may drift, be oval or
   * go either way; a still or scrubbing hand sweeps no angle.
   */
  private stir(p: Point, now: number) {
    const last = this.loop.at(-1);
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.006) return 0;
    this.loop.push({ x: p.x, y: p.y, t: now });
    while (this.loop.length > 3 && now - this.loop[0].t > 2000)
      this.loop.shift();
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const q of this.loop) {
      minX = Math.min(minX, q.x);
      maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
    const w = maxX - minX,
      h = maxY - minY;
    if (Math.min(w, h) < 0.05) {
      this.lastAngle = null;
      return 0;
    }
    // Normalise by the box so an oval is measured like a circle.
    const nx = (p.x - (minX + maxX) / 2) / w,
      ny = (p.y - (minY + maxY) / 2) / h;
    if (Math.hypot(nx, ny) < 0.18) {
      // Too close to the middle for a reliable angle.
      this.lastAngle = null;
      return 0;
    }
    const angle = Math.atan2(ny, nx);
    if (this.lastAngle !== null) {
      let d = angle - this.lastAngle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      // Fast loops and dropped frames make big steps; accept them when they
      // carry on the way the hand is already going round.
      const along =
        Math.abs(this.turn) > Math.PI / 2 &&
        Math.sign(d) === Math.sign(this.turn);
      if (Math.abs(d) < (along ? 2.4 : 1.4)) this.turn += d;
    }
    this.lastAngle = angle;
    // A loop that falls slightly short still counts as a turn.
    const turns = Math.abs(this.turn) / (2 * Math.PI * 0.9);
    const gain = Math.max(0, turns - this.credited);
    this.credited = Math.max(this.credited, turns);
    return gain / actionCount(this.mode);
  }
}
