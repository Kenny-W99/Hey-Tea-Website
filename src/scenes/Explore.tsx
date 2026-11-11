import { useEffect, useCallback, useState, useRef, type Dispatch } from "react";
import { listenHand, listenTravel } from "../camera/input";
import {
  ActionGestures,
  travelActions,
  type TravelAction,
} from "../travel/actions";
import { useCamera } from "../camera/useCamera";
import { recipes } from "../game/catalog";
import { clamp } from "../game/progress";
import type { Run, Action } from "../game/run";
import { World } from "../travel/World";
import { RouteFinish } from "../travel/RouteFinish";
import { HandSteering, type WalkCue } from "../travel/push";
import { viewAt } from "../travel/movement";

const cueText: Record<WalkCue, string> = {
  find: "Show both hands to steer",
  calibrate: "Hold your hands comfortably for a moment",
  rest: "Centered · Paused",
  forward: "Moving forward",
  back: "Moving back",
};

export function Explore({
  run,
  dispatch,
}: {
  run: Run;
  dispatch: Dispatch<Action>;
}) {
  const recipe = recipes[run.city],
    end = recipe.stops.length;
  const view = viewAt(run.distance, end);
  const stop = recipe.stops[view.blend > 0.5 ? view.next : view.section];
  const camera = useCamera();
  const [cue, setCue] = useState<WalkCue>("find");
  const [endDismissed, setEndDismissed] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const completeArrival = useCallback(() => setArrivalComplete(true), []);
  const atEnd = run.distance === end,
    arriving = atEnd && !endDismissed,
    showFinish = arriving && arrivalComplete;
  const steering = useRef(new HandSteering());
  const signs = useRef(new ActionGestures());
  const [action, setAction] = useState<TravelAction | null>(null);
  const endAction = useCallback(() => setAction(null), []);
  const meter = useRef<HTMLDivElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const walk = useRef({
    target: run.distance,
    position: run.distance,
    direction: 0,
    handAxis: 0,
    handTime: -Infinity,
  });
  const checkpoint = useCallback(
    (distance: number) => dispatch({ type: "walk", distance }),
    [dispatch],
  );
  const stopMotion = useCallback(() => {
    const w = walk.current;
    w.direction = 0;
    w.handAxis = 0;
    w.target = w.position;
  }, []);
  const recenter = useCallback(() => {
    steering.current.reset();
    stopMotion();
    setCue("find");
    meter.current?.style.setProperty("--steering", "0");
  }, [stopMotion]);

  // Actions happen while stopped: settle the walk first, then act.
  const act = useCallback((next: TravelAction) => {
    const w = walk.current;
    w.direction = 0;
    w.handAxis = 0;
    w.target = w.position;
    setAction(next);
  }, []);
  useEffect(() => {
    if (camera.status !== "ready" || arriving) return;
    signs.current.reset();
    const offSteer = listenTravel((palms, now) => {
      if (palms.length === 2) signs.current.steering(now);
    });
    const offSign = listenHand((hand) => {
      const w = walk.current;
      const next = signs.current.sample(hand, performance.now());
      const still =
        !w.direction && !w.handAxis && Math.abs(w.target - w.position) < 0.002;
      if (next && still)
        setAction((current) => (current === next ? current : next));
    });
    return () => {
      offSteer();
      offSign();
    };
  }, [camera.status, arriving]);
  useEffect(() => {
    if (arriving) setAction(null);
  }, [arriving]);

  useEffect(() => {
    if (!atEnd) {
      setEndDismissed(false);
      setArrivalComplete(false);
    }
  }, [atEnd]);
  useEffect(() => {
    recenter();
    if (camera.status !== "ready" || arriving) return;
    return listenTravel((palms, now, palmSize) => {
      const w = walk.current,
        axis = steering.current.sample(palms, now, palmSize);
      setCue(steering.current.cue);
      meter.current?.style.setProperty("--steering", String(axis));
      meter.current?.setAttribute(
        "aria-valuenow",
        String(Math.round(axis * 100)),
      );
      if (w.direction) return;
      if (axis === 0 || axis * w.handAxis < 0) w.target = w.position;
      w.handAxis = axis;
      w.handTime = now;
    });
  }, [camera.status, arriving, recenter]);
  useEffect(() => {
    const direction = (key: string) =>
      ["ArrowUp", "w", "W"].includes(key)
        ? 1
        : ["ArrowDown", "s", "S"].includes(key)
          ? -1
          : 0;
    const down = (e: KeyboardEvent) => {
      if (showFinish || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") {
        stopMotion();
        dispatch({ type: "leave" });
        return;
      }
      const pick = travelActions[Number(e.key) - 1];
      if (pick && !arriving && /^[1-4]$/.test(e.key)) {
        act(pick.id);
        return;
      }
      const d = direction(e.key);
      if (d) {
        e.preventDefault();
        if (!arriving) walk.current.direction = d;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (direction(e.key) === walk.current.direction && walk.current.direction)
        stopMotion();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", recenter);
    document.addEventListener("visibilitychange", recenter);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", recenter);
      document.removeEventListener("visibilitychange", recenter);
    };
  }, [showFinish, arriving, dispatch, stopMotion, recenter, act]);
  const resume = () => {
    setEndDismissed(true);
    recenter();
    exitButton.current?.focus();
  };
  return (
    <main className="exploration scene">
      <div className="travel-heading">
        <div>
          <p className="location">{recipe.place} · City walk</p>
          <h1 tabIndex={-1}>{stop.name}</h1>
        </div>
        <div className="travel-exit">
          <span>{recipe.name}</span>
          <button
            ref={exitButton}
            className="secondary"
            onClick={() => {
              stopMotion();
              dispatch({ type: "leave" });
            }}
          >
            ← All destinations
          </button>
        </div>
      </div>
      <World
        recipe={recipe}
        control={walk}
        checkpoint={checkpoint}
        arriving={arriving}
        action={action}
        onActionEnd={endAction}
        onArrivalComplete={completeArrival}
      />
      {arriving && !showFinish && (
        <span className="sr-only" role="status">
          You made it! Cheers to your summer in {recipe.place}.
        </span>
      )}
      <div className="travel-controls">
        <div className="travel-instructions">
          <div
            className="route-distance"
            role="progressbar"
            aria-label="City walk"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((run.distance / end) * 100)}
          >
            <i style={{ width: (run.distance / end) * 100 + "%" }} />
          </div>
          {camera.status === "ready" ? (
            <div className="hand-steering" data-cue={cue}>
              <div className="steering-labels">
                <span>Back</span>
                <strong role="status">{cueText[cue]}</strong>
                <span>Forward</span>
              </div>
              <div
                ref={meter}
                className="steering-meter"
                role="meter"
                aria-label="Hand steering"
                aria-valuemin={-100}
                aria-valuemax={100}
                aria-valuenow={Math.round(steering.current.axis * 100)}
              >
                <span className="steering-center" />
                <i />
              </div>
              <p>
                Open a little to go forward. Bring hands closer to go back.
                Return to center to stop. Then hold ✊ 👍 🖐 or ✌️ with one
                hand.
              </p>
              <button className="recenter-hands" onClick={recenter}>
                Recenter hands
              </button>
            </div>
          ) : (
            <p>
              Hold ↑ or ↓ to walk, or drag along the path. Keys 1–4 pick an
              action.
            </p>
          )}
        </div>
        <div
          className="travel-actions"
          role="group"
          aria-label={
            camera.status === "ready"
              ? "Traveler actions. Stop, then hold a sign with one hand."
              : "Traveler actions"
          }
        >
          {travelActions.map((a, i) => (
            <button
              key={a.id}
              className="secondary action-chip"
              data-manual
              disabled={arriving}
              aria-pressed={action === a.id}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => act(a.id)}
            >
              <span aria-hidden="true">{a.sign}</span> {a.label}
            </button>
          ))}
        </div>
        <div className="walk-buttons">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              className="secondary"
              data-manual
              disabled={arriving}
              aria-label={d === 1 ? "Walk forward" : "Walk back"}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                walk.current.direction = d;
              }}
              onLostPointerCapture={stopMotion}
              onClick={(e) => {
                if (e.detail === 0)
                  walk.current.target = clamp(
                    walk.current.target + d * 0.08,
                    0,
                    end,
                  );
              }}
            >
              {d === 1 ? "Forward ↑" : "↓ Back"}
            </button>
          ))}
          {atEnd && endDismissed && (
            <button className="primary" onClick={() => setEndDismissed(false)}>
              Choose what’s next ↗
            </button>
          )}
        </div>
      </div>
      {showFinish && (
        <RouteFinish
          recipe={recipe}
          cameraReady={camera.status === "ready"}
          onLeave={() => dispatch({ type: "leave" })}
          onResume={resume}
          onFinish={() => dispatch({ type: "finish" })}
        />
      )}
    </main>
  );
}
