import { useCallback, useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { recipes } from "../game/catalog";
import { buttonIncrement } from "../game/progress";
import type { Run, Action } from "../game/run";
import { useStationInput } from "../game/useStationInput";
import { CuttingBoard } from "../game/CuttingBoard";
import { actionCount, isPeel } from "../game/strokes";
import { PeelBoard } from "../game/PeelBoard";
import { StationArt } from "../game/StationArt";
import { useCamera } from "../camera/useCamera";
const cameraCue = {
  split: "Slice back and forth four times with the HEYTEA helper.",
  peel: "Move your hand down slowly. The helper peels the skin as you pull.",
  arc: "Move your hand down slowly. The helper unwraps the peel as you pull.",
  scoop: "Sweep your hand down once to scoop the pulp into the bowl.",
  transfer: "Sweep your hand down once to drop the fruit into the bowl.",
  squeeze:
    "Squeeze briefly, then open your hand. Do it twice, or press down and lift.",
  mash: "Press down three times. Lift your hand between presses.",
  pour: "Tilt gently for a thin stream, or tilt farther to pour faster. Straighten to pause.",
  stir: "Draw two steady circles in the air. The helper mixes along with you.",
};
export function Station({
  run,
  dispatch,
}: {
  run: Run;
  dispatch: Dispatch<Action>;
}) {
  const r = recipes[run.city],
    step = r.steps[run.step],
    pad = useRef<HTMLDivElement>(null),
    cam = useCamera();
  const advance = useCallback(
    (delta: number) => dispatch({ type: "advance", delta }),
    [dispatch],
  );
  const portionAt = useRef(-Infinity);
  const count = actionCount(step.mode);
  const units = {
    split: "cuts",
    peel: "strips",
    arc: "strips",
    squeeze: "squeezes",
    scoop: "spoonfuls",
    transfer: "portions",
    mash: "presses",
    stir: "turns",
    pour: "",
  };
  const complete = run.progress >= 1;
  useEffect(() => {
    if (!complete) return;
    // Leave time to see the finished result and the helper's celebration.
    const timer = window.setTimeout(
      () => dispatch({ type: "next" }),
      step.mode === "split" ? 2300 : isPeel(step.mode) ? 2200 : 1900,
    );
    return () => window.clearTimeout(timer);
  }, [complete, run.step, step.mode, dispatch]);
  const { pointer, engaged, tracked, flow } = useStationInput(
    pad,
    step.mode,
    advance,
    run.progress < 1,
  );
  return (
    <main className="workspace scene">
      <div className="work-copy">
        <p className="location">
          {r.place} · {r.name}
        </p>
        <h1 tabIndex={-1}>
          {step.title}
          <em>.</em>
        </h1>
        <p className="instruction">
          {cam.status === "ready"
            ? cameraCue[step.mode]
            : step.mode === "split"
              ? "Make four sideways cuts. You can drag back and forth."
              : isPeel(step.mode)
                ? "Drag down slowly. The peel comes away as you pull."
                : step.instruction}
        </p>
        {cam.status === "ready" && !complete && (
          <p className="hand-signal" role="status">
            {tracked ? "Hand in view" : "Show one hand to the camera"}
          </p>
        )}
        <div className="recipe-progress">
          <span>Preparation</span>
          <span>
            {run.step + 1} / {r.steps.length}
          </span>
        </div>
        <div className="steps">
          {r.steps.map((s, i) => (
            <i className={i <= run.step ? "filled" : ""} key={s.title} />
          ))}
        </div>
        <p className="progress-label" role="status">
          {run.progress >= 1
            ? "Step complete"
            : count
              ? Math.min(count, Math.floor(run.progress * count + 1e-6)) +
                " / " +
                count +
                " " +
                (count === 1
                  ? units[step.mode].replace(/s$/, "")
                  : units[step.mode])
              : Math.round(run.progress * 100) +
                (isPeel(step.mode) ? "% peeled" : "% complete")}
        </p>
        {!complete && (
          <button
            className="secondary"
            data-manual
            onClick={() => {
              portionAt.current = performance.now();
              advance(buttonIncrement(step.mode));
            }}
          >
            {step.button}
          </button>
        )}
      </div>
      <div
        className="station-pad"
        ref={pad}
        aria-label={step.title + " interaction area"}
        style={{
          backgroundColor: "color-mix(in srgb," + r.color + " 24%, #fffaf1)",
        }}
      >
        {step.mode === "split" && step.fruit ? (
          <CuttingBoard fruit={step.fruit} progress={run.progress} />
        ) : isPeel(step.mode) && step.fruit ? (
          <PeelBoard fruit={step.fruit} progress={run.progress} />
        ) : (
          <StationArt
            recipe={r}
            step={step}
            progress={run.progress}
            pointer={pointer}
            engaged={engaged}
            flow={flow}
            portionAt={portionAt}
          />
        )}
        {cam.status !== "ready" &&
          (step.mode === "scoop" || step.mode === "transfer") && (
            <span className="drop-zone">Drop into bowl ↓</span>
          )}
      </div>
    </main>
  );
}
