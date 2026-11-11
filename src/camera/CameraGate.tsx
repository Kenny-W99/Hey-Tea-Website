import { useEffect, useRef } from "react";
import { camera } from "./input";
import { useCamera } from "./useCamera";
import { SummerArtwork } from "../scenes/SummerArtwork";
export function CameraGate({ onEnter }: { onEnter: () => void }) {
  const state = useCamera(),
    heading = useRef<HTMLHeadingElement>(null);
  const busy = state.status === "requesting" || state.status === "checking";
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (state.status !== "ready") return;
    const id = setTimeout(onEnter, 1250);
    return () => clearTimeout(id);
  }, [state.status, onEnter]);
  return (
    <main className="entry">
      <section
        className="invitation"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
        aria-describedby="entry-desc"
      >
        <SummerArtwork />
        <div className="invite-copy">
          <h1 id="entry-title" tabIndex={-1} ref={heading}>
            Get Ready to <br />
            <em>Make Your Summer!</em>
          </h1>
          <p id="entry-desc">
            Enable your camera to create your HEYTEA drink and explore summer
            with your hands.
          </p>
          <div className="invite-actions">
            {state.status !== "ready" && (
              <button
                className="primary"
                disabled={busy}
                onClick={camera.enable}
              >
                {state.status === "error"
                  ? "Try Again"
                  : busy
                    ? "Connecting…"
                    : "Enable Camera"}
                <CameraIcon />
              </button>
            )}
            {state.status !== "ready" && (
              <button
                className="secondary"
                onClick={() => {
                  camera.stop();
                  onEnter();
                }}
              >
                Continue Without Camera
              </button>
            )}
          </div>
          <div className="camera-note" role="status">
            {state.message ||
              "Your camera stays private. Video is processed on your device."}
          </div>
        </div>
      </section>
    </main>
  );
}
export function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="2.5" y="6" width="13" height="12" rx="3" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}
export function CameraSwitch() {
  const state = useCamera();
  const active = ["checking", "requesting", "ready"].includes(state.status);
  return (
    <div className="camera-switch">
      <button
        aria-label={active ? "Disable camera" : "Enable camera"}
        onClick={active ? camera.stop : camera.enable}
      >
        <CameraIcon />
        {state.status === "ready"
          ? "Camera on"
          : active
            ? "Connecting…"
            : state.status === "error"
              ? "Try Again"
              : "Camera off"}
      </button>
      {state.status === "error" && <small role="status">{state.message}</small>}
    </div>
  );
}
