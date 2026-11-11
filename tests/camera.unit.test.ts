import { expect, it, vi } from "vitest";
import { CameraSession, type CameraDeps } from "../src/camera/session";
import { GestureFilter } from "../src/camera/gestures";
export function fakeStream() {
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  return {
    track,
    stream: {
      getTracks: () => [track],
      getVideoTracks: () => [track],
    } as unknown as MediaStream,
  };
}
it("requests immediately on enable and becomes ready only after inference", async () => {
  const { stream, track } = fakeStream(),
    acquire = vi.fn(async () => stream);
  let initialized = () => {};
  const start: CameraDeps["start"] = () =>
    new Promise((resolve) => {
      initialized = () => resolve(() => {});
    });
  const camera = new CameraSession({ acquire, start }, vi.fn());
  expect(acquire).not.toHaveBeenCalled();
  const result = camera.enable();
  void camera.enable();
  expect(acquire).toHaveBeenCalledTimes(1);
  await Promise.resolve();
  expect(camera.state.status).toBe("checking");
  initialized();
  await result;
  expect(camera.state.status).toBe("ready");
  camera.stop();
  expect(track.stop).toHaveBeenCalledOnce();
});
it.each(["NotFoundError", "NotAllowedError", "NotReadableError"])(
  "recovers from %s through retry",
  async (name) => {
    const { stream } = fakeStream();
    const camera = new CameraSession(
      {
        acquire: vi
          .fn()
          .mockRejectedValueOnce(new DOMException("", name))
          .mockResolvedValue(stream),
        start: async () => () => {},
      },
      vi.fn(),
    );
    await camera.enable();
    expect(camera.state.status).toBe("error");
    await camera.enable();
    expect(camera.state.status).toBe("ready");
    camera.stop();
  },
);
it("stops an abandoned stream after skip", async () => {
  const { stream, track } = fakeStream();
  let grant!: (s: MediaStream) => void;
  const start = vi.fn();
  const camera = new CameraSession(
    {
      acquire: () =>
        new Promise((r) => {
          grant = r;
        }),
      start,
    },
    vi.fn(),
  );
  const pending = camera.enable();
  camera.stop();
  grant(stream);
  await pending;
  expect(track.stop).toHaveBeenCalledOnce();
  expect(start).not.toHaveBeenCalled();
});
it("releases tracks after a model failure", async () => {
  const { stream, track } = fakeStream();
  const camera = new CameraSession(
    {
      acquire: async () => stream,
      start: async () => {
        throw Error();
      },
    },
    vi.fn(),
  );
  await camera.enable();
  expect(camera.state.status).toBe("error");
  expect(track.stop).toHaveBeenCalledOnce();
});
it("stabilizes pinch, clears on loss and rejects low confidence fist", () => {
  const filter = new GestureFilter(),
    points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  points[5] = { x: 0.38, y: 0.5 };
  points[17] = { x: 0.63, y: 0.5 };
  const hand = { points, pose: { categoryName: "Closed_Fist", score: 0.1 } };
  expect(filter.update(hand, 1)?.pinch).toBe(false);
  expect(filter.update(hand, 100)?.pinch).toBe(true);
  points[4] = { x: 0.6, y: 0.5 };
  expect(filter.update(hand, 200)?.pinch).toBe(true);
  expect(filter.update(hand, 210)?.fist).toBe(false);
  expect(filter.update({ points: [] }, 220)).toBeNull();
});
it("shares a still-open native prompt across skip and immediate re-enable", async () => {
  const { stream, track } = fakeStream();
  let grant!: (s: MediaStream) => void;
  const acquire = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
  );
  const start = vi.fn(async () => () => {});
  const camera = new CameraSession({ acquire, start }, vi.fn());
  const first = camera.enable();
  camera.stop();
  const second = camera.enable();
  grant(stream);
  await Promise.all([first, second]);
  expect(acquire).toHaveBeenCalledOnce();
  expect(start).toHaveBeenCalledOnce();
  expect(track.stop).not.toHaveBeenCalled();
  camera.stop();
  expect(track.stop).toHaveBeenCalledOnce();
});
it("separates held poses from brief noise across 24 deterministic trials", () => {
  for (let trial = 0; trial < 24; trial++) {
    const filter = new GestureFilter();
    const points = Array.from({ length: 21 }, () => ({ x: 0.48, y: 0.5 }));
    const separation = trial % 2 === 0 ? 0.012 : 0.115;
    points[5] = { x: 0.36, y: 0.5 };
    points[17] = { x: 0.6, y: 0.5 };
    points[4] = { x: 0.48 + separation, y: 0.5 };
    const pinch = trial % 2 === 0;
    let firstSeen = -1;
    for (let frame = 0; frame < 10; frame++) {
      const time = frame * 65;
      const drift = 0.095 * Math.sin(frame * 0.6 + trial);
      points[8] = { x: 0.48 + drift, y: 0.5 };
      points[4] = { x: 0.48 + drift + separation, y: 0.5 };
      const result = filter.update(
        { points, pose: { categoryName: "Closed_Fist", score: 0.28 } },
        time,
      )!;
      if (result.pinch && firstSeen < 0) firstSeen = time;
      expect(result.fist).toBe(false);
    }
    if (pinch) expect(firstSeen).toBe(130);
    else expect(firstSeen).toBe(-1);
    expect(filter.update({ points: [] }, 700)).toBeNull();
    expect(filter.update({ points }, 765)?.pinch).toBe(false);
  }
});
