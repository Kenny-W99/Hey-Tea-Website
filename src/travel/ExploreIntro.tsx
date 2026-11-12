import { useEffect, useRef } from "react";
import type { Recipe } from "../game/catalog";
import { camera } from "../camera/input";
import { travelActions } from "./actions";

/** A line-drawn open hand, palm toward the viewer. */
function Hand({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g
      transform={
        "translate(" + x + " 6)" + (flip ? " translate(38 0) scale(-1 1)" : "")
      }
      fill="#fff"
      stroke="var(--ink)"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <rect x="9" y="4" width="6" height="20" rx="3" />
      <rect x="16" y="1" width="6" height="23" rx="3" />
      <rect x="23" y="3" width="6" height="21" rx="3" />
      <rect x="30" y="8" width="5.5" height="17" rx="2.75" />
      <rect
        x="1"
        y="20"
        width="6"
        height="15"
        rx="3"
        transform="rotate(-38 4 27)"
      />
      <path d="M8 17h28v14c0 8-6 13-14 13S8 39 8 31z" />
    </g>
  );
}

/** Two raised hands with arrows: apart walks forward, closer walks back. */
function Steer({ move }: { move: "forward" | "back" | "stop" }) {
  const arrow = (x: number, dir: 1 | -1) => (
    <path
      d={
        "M" +
        x +
        " 28h" +
        dir * 12 +
        "m" +
        -dir * 5 +
        " -5l" +
        dir * 5 +
        " 5l" +
        -dir * 5 +
        " 5"
      }
    />
  );
  return (
    <svg viewBox="0 0 120 56" aria-hidden="true">
      <Hand x={move === "back" ? 14 : 4} />
      <Hand x={move === "back" ? 68 : 78} flip />
      <g
        fill="none"
        stroke="#f2b62c"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {move === "forward" && [arrow(52, -1), arrow(68, 1)]}
        {move === "back" && [arrow(4, 1), arrow(116, -1)]}
        {move === "stop" && (
          <>
            <path d="M54 22v12" />
            <path d="M66 22v12" />
          </>
        )}
      </g>
    </svg>
  );
}

/** The decorative palm and sand line from the campaign artwork. */
function Palm() {
  return (
    <svg className="intro-palm" viewBox="0 0 120 120" aria-hidden="true">
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M60 116c2-22 0-48-6-70" />
        <path d="M66 116c2-22 0-48-6-70" />
        <path d="M30 116h70" />
        <g fill="#7fbf6a">
          <path d="M57 46c-10-14-26-18-40-12 14 0 26 6 32 16z" />
          <path d="M57 46c-4-16-16-26-30-26 10 6 20 16 24 28z" />
          <path d="M57 46c6-16 20-24 34-20-12 2-24 10-28 22z" />
          <path d="M57 46c14-8 30-6 40 6-12-4-26-2-36 2z" />
          <path d="M57 46c-12-2-24 6-28 20 6-8 16-14 26-14z" />
        </g>
      </g>
    </svg>
  );
}

const camLabel = { forward: "Forward", back: "Back", stop: "Stop" } as const;

/**
 * How to play the city walk, shown before it starts (and again from the
 * help button). With the camera on, the visitor sees themself in the frame
 * beside the moves; without it, the keys and buttons that do the same.
 */
export function ExploreIntro({
  recipe,
  cameraReady,
  onStart,
}: {
  recipe: Recipe;
  cameraReady: boolean;
  onStart: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => {
    const v = video.current,
      stream = cameraReady ? camera.preview() : undefined;
    if (!v || !stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
    return () => {
      v.srcObject = null;
    };
  }, [cameraReady]);
  const walking = cameraReady
    ? ([
        ["forward", "Move both hands a little apart"],
        ["back", "Bring both hands closer"],
        ["stop", "Hold them where you started"],
      ] as const)
    : ([
        ["forward", "Hold ↑ or drag up the path"],
        ["back", "Hold ↓ or drag down"],
      ] as const);
  return (
    <dialog
      ref={dialog}
      className="explore-intro"
      aria-labelledby="explore-intro-heading"
      onCancel={(e) => {
        e.preventDefault();
        onStart();
      }}
    >
      <h2 id="explore-intro-heading" className="intro-title">
        Use Your Body to Explore
      </h2>
      <p className="intro-sub">
        Walk through {recipe.place} and strike a pose along the way.
      </p>
      <div className="intro-body">
        <figure className="intro-camera" data-live={cameraReady}>
          {cameraReady ? (
            <video ref={video} muted playsInline aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 200 150" aria-hidden="true">
              <path
                d="M64 150c0-30 16-46 36-46s36 16 36 46"
                fill="#9c9893"
                opacity="0.7"
              />
              <circle cx="100" cy="76" r="22" fill="#9c9893" opacity="0.7" />
              <g transform="translate(14 46) rotate(-12 20 24)">
                <Hand x={0} />
              </g>
              <g transform="translate(144 46) rotate(12 20 24)">
                <Hand x={0} flip />
              </g>
              <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
                <path d="M14 40l-6-6M24 32l-2-9M36 34l3-8" />
                <path d="M186 40l6-6M176 32l2-9M164 34l-3-8" />
              </g>
            </svg>
          )}
          <figcaption className="intro-badge">
            <svg viewBox="0 0 24 18" aria-hidden="true">
              <rect
                x="1.5"
                y="3.5"
                width="21"
                height="13"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="12"
                cy="10"
                r="3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path d="M8 3.5l1.5-2h5l1.5 2" fill="currentColor" />
            </svg>
            {cameraReady ? "Camera On" : "Camera Off · keys and taps"}
          </figcaption>
        </figure>
        <div className="intro-moves">
          <p className="intro-group">
            {cameraReady ? "Walk with both hands" : "Walk"}
          </p>
          <ul>
            {walking.map(([move, how]) => (
              <li key={move}>
                {cameraReady ? (
                  <Steer move={move} />
                ) : (
                  <kbd aria-hidden="true">{move === "back" ? "↓" : "↑"}</kbd>
                )}
                <span className="intro-pill">{camLabel[move]}</span>
                <small>{how}</small>
              </li>
            ))}
          </ul>
          <p className="intro-group">
            {cameraReady
              ? "Stop, then hold a sign with one hand"
              : "Stop, then tap a sign or press 1–4"}
          </p>
          <ul className="intro-signs">
            {travelActions.map((a) => (
              <li key={a.id}>
                <span className="intro-sign" aria-hidden="true">
                  {a.sign}
                </span>
                <span className="intro-pill">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        className="intro-start"
        onClick={onStart}
        data-gesture-pad="72"
        autoFocus
      >
        Start
      </button>
      {cameraReady && (
        <small className="intro-pinch">Point at Start and pinch.</small>
      )}
      <Palm />
    </dialog>
  );
}
