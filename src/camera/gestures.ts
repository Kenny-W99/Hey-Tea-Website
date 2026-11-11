export interface Point {
  x: number;
  y: number;
}
export interface Hand {
  point: Point;
  pinch: boolean;
  fist: boolean;
  palm: boolean;
  tilt: number;
  palmSize: number;
  motionPoint: Point;
  /** Stable recognizer category, e.g. "Thumb_Up". Empty while pinching or unsure. */
  gesture: string;
}
export interface Sample {
  points: Point[];
  second?: Point[];
  pose?: { categoryName: string; score: number };
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function measurePalm(points: Point[]) {
  return (
    (distance(points[0], points[9]) +
      distance(points[5], points[17]) +
      distance(points[0], points[5]) +
      distance(points[0], points[17])) /
    4
  );
}
export class GestureFilter {
  private hand: Hand | null = null;
  private candidate = "";
  private since = 0;
  update(sample: Sample, time: number): Hand | null {
    const p = sample.points;
    if (p.length < 21) {
      this.hand = null;
      this.candidate = "";
      return null;
    }
    const ratio = distance(p[4], p[8]) / Math.max(0.02, distance(p[5], p[17]));
    const pose =
      (sample.pose?.score ?? 0) >= 0.65 ? sample.pose?.categoryName : "";
    const candidate =
      ratio < (this.hand?.pinch ? 0.54 : 0.36) ? "pinch" : pose || "";
    if (candidate !== this.candidate) {
      this.candidate = candidate;
      this.since = time;
    }
    const stable = time - this.since >= 80;
    const raw = {
      x: Math.min(1, Math.max(0, (1 - p[8].x - 0.1) / 0.8)),
      y: Math.min(1, Math.max(0, (p[8].y - 0.1) / 0.8)),
    };
    const last = this.hand?.point ?? raw;
    // Fingertip coordinates for local movement retain the full camera field.
    // The separate UI cursor can safely clamp at the edges of the viewport.
    const motion = { x: 1 - p[8].x, y: p[8].y };
    const previous = this.hand?.motionPoint ?? motion;
    this.hand = {
      motionPoint: {
        x: previous.x + (motion.x - previous.x) * 0.75,
        y: previous.y + (motion.y - previous.y) * 0.75,
      },
      palmSize: measurePalm(p),
      point: {
        x: last.x + (raw.x - last.x) * 0.65,
        y: last.y + (raw.y - last.y) * 0.65,
      },
      pinch: stable && candidate === "pinch",
      fist: stable && pose === "Closed_Fist",
      palm: stable && pose === "Open_Palm",
      gesture: stable && candidate !== "pinch" ? pose || "" : "",
      tilt: Math.abs(Math.atan2(p[9].x - p[0].x, p[0].y - p[9].y)),
    };
    return this.hand;
  }
}
