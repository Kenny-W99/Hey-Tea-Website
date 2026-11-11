import type { CameraDeps } from "./session";
export const device: CameraDeps = {
  acquire() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      return Promise.reject(new DOMException("Unavailable", "NotFoundError"));
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
  },
  async start(stream, signal, sample, fail) {
    if (
      typeof Worker === "undefined" ||
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      const { startMainThread } = await import("./mainThread");
      if (signal.aborted) throw new DOMException("Stopped", "AbortError");
      return startMainThread(stream, signal, sample, fail);
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    const worker = new Worker("/vision/worker.js");
    let raf = 0,
      lastFrame = -1,
      lastTime = 0,
      closed = false,
      ready = false;
    const close = () => {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      worker.terminate();
      video.pause();
      video.srcObject = null;
    };
    return new Promise<() => void>((resolve, reject) => {
      const error = () => {
        close();
        if (ready) fail();
        else reject(new Error("Hand tracking unavailable"));
      };
      signal.addEventListener(
        "abort",
        () => {
          close();
          reject(new DOMException("Stopped", "AbortError"));
        },
        { once: true },
      );
      const tick = async (time: number) => {
        if (closed) return;
        if (
          video.readyState < 2 ||
          video.currentTime === lastFrame ||
          time - lastTime < 65
        ) {
          raf = requestAnimationFrame(tick);
          return;
        }
        lastFrame = video.currentTime;
        lastTime = time;
        try {
          const frame = await createImageBitmap(video);
          if (closed) {
            frame.close();
            return;
          }
          worker.postMessage({ type: "frame", frame, time }, [frame]);
        } catch {
          error();
        }
      };
      worker.onerror = error;
      worker.onmessage = ({ data }) => {
        if (closed) return;
        if (data.type === "error") {
          error();
          return;
        }
        if (data.type === "result") {
          sample(data);
          if (!ready) {
            ready = true;
            resolve(close);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      video
        .play()
        .then(() => {
          if (!closed) worker.postMessage({ type: "init" });
        })
        .catch(error);
    });
  },
};
