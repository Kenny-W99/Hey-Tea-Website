import { useEffect, useRef } from "react";
import type { Recipe } from "../game/catalog";

export function RouteFinish({
  recipe,
  cameraReady,
  onLeave,
  onResume,
  onFinish,
}: {
  recipe: Recipe;
  cameraReady: boolean;
  onLeave: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  const resume = () => {
    dialog.current?.close();
    onResume();
  };
  return (
    <dialog
      ref={dialog}
      className="route-finish"
      aria-labelledby="route-finish-heading"
      onCancel={(e) => {
        e.preventDefault();
        resume();
      }}
    >
      <div className="route-finish-art">
        <img src={"/art/" + recipe.city + "/cup.webp"} alt={recipe.name} />
      </div>
      <div className="route-finish-copy">
        <p className="location">{recipe.place} · Walk complete</p>
        <h2 id="route-finish-heading">
          Where to <em>next?</em>
        </h2>
        <p>There's another summer waiting for you.</p>
        <button className="primary" onClick={onLeave}>
          Choose another city ↗
        </button>
        <button className="secondary" onClick={resume}>
          Keep exploring
        </button>
        <button className="route-postcard" onClick={onFinish}>
          Finish your summer →
        </button>
        {cameraReady && (
          <small>Use one hand to point and pinch a button.</small>
        )}
      </div>
    </dialog>
  );
}
