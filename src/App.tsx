import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { cue, toggleSound } from "./sound";
import { camera } from "./camera/input";
import { CameraGate, CameraSwitch } from "./camera/CameraGate";
import { HandCursor } from "./camera/HandCursor";
import { initial, restore, reduceRun } from "./game/run";
import { recipes } from "./game/catalog";
import { Globe, Choose, Keepsake } from "./scenes/Scenes";
import { Station } from "./scenes/Station";
import { Explore } from "./scenes/Explore";
const storageKey = "heytea-summer-v1";
const names = {
  globe: "Summer Globe",
  choose: "Choose your summer",
  station: "Make your summer",
  reveal: "Your drink",
  explore: "Explore your summer",
  final: "Your summer",
};
export default function App() {
  const [entered, setEntered] = useState(false);
  const [run, dispatch] = useReducer(reduceRun, initial, () => {
    try {
      return restore(sessionStorage.getItem(storageKey));
    } catch {
      return initial;
    }
  });
  const enter = useCallback(() => setEntered(true), []);
  const wrap = useRef<HTMLDivElement>(null),
    scene = run.scene;
  const [opening, setOpening] = useState(false);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    if (entered)
      cue(
        scene === "reveal" ? "ready" : scene === "explore" ? "travel" : "step",
      );
  }, [entered, scene, run.step]);
  useEffect(() => {
    const stop = () => camera.stop();
    const hide = () => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      stop();
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  const latest = useRef(run);
  latest.current = run;
  const lastScene = useRef(""),
    popping = useRef(false);
  useLayoutEffect(() => {
    if (!entered) return;
    const sceneKey = run.city + "/" + run.scene;
    if (!lastScene.current || popping.current) {
      history.replaceState({ heytea: run }, "");
      popping.current = false;
    } else if (lastScene.current !== sceneKey) {
      history.pushState({ heytea: run }, "");
    }
    lastScene.current = sceneKey;
  }, [run, entered]);
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(latest.current));
      } catch {
        /* Storage disabled. */
      }
      if (entered) history.replaceState({ heytea: latest.current }, "");
    };
    // Coalesce high-frequency pointer updates, and always flush before page exit.
    const timer = setTimeout(save, 160);
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [run, entered]);
  useEffect(() => {
    const back = (e: PopStateEvent) => {
      if (entered && e.state?.heytea) {
        popping.current = true;
        camera.stop();
        dispatch({ type: "restore", run: e.state.heytea });
      }
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [entered]);
  useEffect(() => {
    if (entered && scene === "final") camera.stop();
  }, [scene, entered]);
  useLayoutEffect(() => {
    if (!entered) return;
    const root = wrap.current,
      heading = root?.querySelector<HTMLElement>("h1");
    heading?.focus({ preventScroll: true });
    const el = root?.querySelector(".scene");
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(
      el,
      { opacity: 0.25, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.38,
        ease: "power2.out",
        clearProps: "transform,opacity",
      },
    );
    return () => {
      tween.kill();
    };
  }, [scene, run.step, entered]);
  useLayoutEffect(() => {
    if (!opening) return;
    const target = wrap.current?.querySelector(".globe-photo");
    if (!target || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dispatch({ type: "enter" });
      setOpening(false);
      return;
    }
    const tween = gsap.to(target, {
      scale: 1.18,
      transformOrigin: "55% 58%",
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        dispatch({ type: "enter" });
        setOpening(false);
      },
    });
    return () => {
      tween.kill();
    };
  }, [opening]);
  return (
    <div className={"app " + (!entered ? "gated" : "")}>
      <header className="mast">
        <div className="brand">
          <img src="/art/wordmark.webp" alt="HEYTEA" />
        </div>
        <span className="mast-title">Summer Is Not a Season</span>
        {entered && scene !== "final" ? (
          <CameraSwitch />
        ) : (
          <span className="mast-season">Summer Globe</span>
        )}
      </header>
      {!entered ? (
        <CameraGate onEnter={enter} />
      ) : (
        <div ref={wrap} className="screen">
          {scene === "globe" && <Globe onEnter={() => setOpening(true)} />}
          {scene === "choose" && (
            <Choose choose={(city) => dispatch({ type: "select", city })} />
          )}
          {scene === "station" && (
            <Station key={run.city + run.step} run={run} dispatch={dispatch} />
          )}
          {scene === "reveal" && (
            <Keepsake
              recipe={recipes[run.city]}
              final={false}
              onNext={() => dispatch({ type: "explore" })}
            />
          )}
          {scene === "explore" && <Explore run={run} dispatch={dispatch} />}
          {scene === "final" && (
            <Keepsake
              recipe={recipes[run.city]}
              final
              onNext={() => dispatch({ type: "replay" })}
            />
          )}
        </div>
      )}
      <footer>
        <span>HEYTEA · Make Your Summer</span>
        {entered && (
          <button
            className="sound"
            aria-pressed={sound}
            onClick={async () => setSound(await toggleSound())}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
        )}
        <span>{entered ? names[scene] : "Virtual Summer Globe"}</span>
      </footer>
      {entered && <HandCursor />}
    </div>
  );
}
