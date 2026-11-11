import { GestureFilter, measurePalm, type Hand, type Point } from "./gestures";
import { CameraSession } from "./session";
import { device } from "./device";
const filter = new GestureFilter();
type Listener = (hand: Hand | null) => void;
const listeners = new Set<Listener>();
export function listenHand(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
type TravelListener = (
  palms: readonly Point[],
  time: number,
  palmSize: number,
) => void;
const travelListeners = new Set<TravelListener>();
export function listenTravel(fn: TravelListener) {
  travelListeners.add(fn);
  return () => {
    travelListeners.delete(fn);
  };
}
function palmCenter(points: Point[]): Point {
  const [wrist, index, middle, little] = [
    points[0],
    points[5],
    points[9],
    points[17],
  ];
  return {
    x: (wrist.x + index.x + middle.x + little.x) / 4,
    y: (wrist.y + index.y + middle.y + little.y) / 4,
  };
}
export const camera = new CameraSession(device, (sample) => {
  const now = performance.now();
  const pair = sample.points.length >= 21 && (sample.second?.length ?? 0) >= 21;
  const palms = pair
    ? [palmCenter(sample.points), palmCenter(sample.second!)].sort(
        (a, b) => a.x - b.x,
      )
    : [];
  const palmSize = pair
    ? (measurePalm(sample.points) + measurePalm(sample.second!)) / 2
    : 0;
  // Model order may swap when two hands meet. Do not move the kitchen tool
  // or click a button with the travel gesture.
  const hand = filter.update(pair ? { points: [] } : sample, now);
  listeners.forEach((fn) => fn(hand));
  travelListeners.forEach((fn) => fn(palms, now, palmSize));
});
