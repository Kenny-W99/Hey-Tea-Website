import type { CameraDeps } from "./session";
// Used only when the platform lacks a worker-capable canvas. Throttle
// synchronous inference and release the recognizer on the same abort signal.
export const startMainThread: CameraDeps["start"] = async (
  stream,
  signal,
  sample,
  fail,
) => {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  let frame = 0,
    closed = false,
    ready = false,
    lastFrame = -1,
    lastTime = 0;
  let tracker: import("@mediapipe/tasks-vision").GestureRecognizer | undefined;
  function close() {
    closed = true;
    cancelAnimationFrame(frame);
    video.pause();
    video.srcObject = null;
    tracker?.close();
    tracker = undefined;
  }
  signal.addEventListener("abort", close, { once: true });
  try {
    const { GestureRecognizer, FilesetResolver } =
      await import("@mediapipe/tasks-vision");
    if (closed) throw new DOMException("Stopped", "AbortError");
    const files = await FilesetResolver.forVisionTasks("/vision/wasm");
    tracker = await GestureRecognizer.createFromOptions(files, {
      baseOptions: { modelAssetPath: "/vision/gesture_recognizer.task" },
      numHands: 2,
      runningMode: "VIDEO",
    });
    if (closed) throw new DOMException("Stopped", "AbortError");
    await video.play();
    return await new Promise<() => void>((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("Stopped", "AbortError")),
        { once: true },
      );
      const tick = (now: number) => {
        if (closed) return;
        try {
          if (
            video.readyState >= 2 &&
            lastFrame !== video.currentTime &&
            now - lastTime >= 100
          ) {
            lastTime = now;
            lastFrame = video.currentTime;
            const result = tracker!.recognizeForVideo(video, now);
            sample({
              points: result.landmarks[0] || [],
              second: result.landmarks[1],
              pose: result.gestures[0]?.[0],
            });
            if (!ready) {
              ready = true;
              resolve(close);
            }
          }
          frame = requestAnimationFrame(tick);
        } catch (error) {
          close();
          if (ready) fail();
          else reject(error);
        }
      };
      frame = requestAnimationFrame(tick);
    });
  } catch (error) {
    close();
    throw error;
  }
};
