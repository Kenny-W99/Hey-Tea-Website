import type { Sample } from "./gestures";
export type CameraState = {
  status: "off" | "requesting" | "checking" | "ready" | "error";
  message: string;
};
export interface CameraDeps {
  acquire: () => Promise<MediaStream>;
  start: (
    stream: MediaStream,
    signal: AbortSignal,
    sample: (s: Sample) => void,
    fail: () => void,
  ) => Promise<() => void>;
}
const off: CameraState = { status: "off", message: "" };
function explanation(error: unknown) {
  switch ((error as Error)?.name) {
    case "NotAllowedError":
      return "Camera access is off. You can allow it in your browser’s site settings and try again.";
    case "NotFoundError":
      return "We couldn’t find a camera. Connect one to try again, or play with the controls.";
    case "NotReadableError":
      return "Your camera may be in use. Close the other camera app and try again.";
    default:
      return "We couldn’t get hand tracking ready. Try again or keep playing with the controls.";
  }
}
export class CameraSession {
  state = off;
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private pending?: Promise<MediaStream>;
  private stream?: MediaStream;
  private close?: () => void;
  constructor(
    private deps: CameraDeps,
    private sample: (s: Sample) => void,
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  /** The live camera picture, for an on-screen preview while tracking runs. */
  preview = () => (this.state.status === "ready" ? this.stream : undefined);
  private set(value: CameraState) {
    this.state = value;
    this.listeners.forEach((fn) => fn());
  }
  stop = () => {
    this.controller?.abort();
    this.controller = undefined;
    this.close?.();
    this.close = undefined;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.sample({ points: [] });
    this.set(off);
  };
  enable = async () => {
    if (this.controller) return;
    const controller = new AbortController();
    this.controller = controller;
    const active = () => this.controller === controller;
    const fail = (error?: unknown) => {
      if (!active()) return;
      this.stop();
      this.set({ status: "error", message: explanation(error) });
    };
    this.set({
      status: "requesting",
      message: "Allow camera access in your browser.",
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // A browser permission prompt cannot be cancelled. Reuse it if the
      // visitor skips and immediately re-enables before the browser replies.
      const pending = this.pending ?? this.deps.acquire();
      this.pending = pending;
      let stream: MediaStream;
      try {
        stream = await pending;
      } finally {
        if (this.pending === pending) this.pending = undefined;
      }
      if (!active()) {
        if (!this.controller) stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      stream
        .getVideoTracks()
        .forEach((t) =>
          t.addEventListener("ended", () => fail(), {
            once: true,
            signal: controller.signal,
          }),
        );
      this.set({ status: "checking", message: "Warming up hand tracking…" });
      timer = setTimeout(() => fail(), 30000);
      const close = await this.deps.start(
        stream,
        controller.signal,
        (s) => {
          if (active()) this.sample(s);
        },
        fail,
      );
      if (!active()) {
        close();
        return;
      }
      this.close = close;
      this.set({
        status: "ready",
        message: "Camera Ready! Let's Make Summer.",
      });
    } catch (error) {
      fail(error);
    } finally {
      clearTimeout(timer);
    }
  };
}
