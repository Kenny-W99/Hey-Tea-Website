import { useEffect, type CSSProperties } from "react";
import type { Recipe } from "../game/catalog";

const duration = 2600;

/** The route stays in place while the traveler turns, toasts and lands. */
export function Arrival({
  recipe,
  onComplete,
}: {
  recipe: Recipe;
  onComplete: () => void;
}) {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(onComplete, reduced ? 900 : duration);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const cup = "/art/" + recipe.city + "/cup.webp";
  return (
    <div
      className="arrival"
      style={{ "--arrival-duration": duration + "ms" } as CSSProperties}
      aria-hidden="true"
    >
      <div className="arrival-back">
        <img src={cup} alt="" />
      </div>
      <div className="arrival-front">
        <div className="arrival-jump">
          <img
            className="arrival-body"
            src="/art/traveler/wave-body.webp"
            alt=""
          />
          <img
            className="arrival-wave"
            src="/art/traveler/wave-arm.webp"
            alt=""
          />
          <div className="arrival-toast">
            <img
              className="arrival-arm"
              src="/art/traveler/wave-body.webp"
              alt=""
            />
            <img className="arrival-cup" src={cup} alt="" />
          </div>
        </div>
      </div>
      <div className="arrival-sparkles">
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="arrival-cheers">Cheers to your summer!</span>
    </div>
  );
}
