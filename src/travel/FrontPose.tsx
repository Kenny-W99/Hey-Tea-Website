import type { Recipe } from "../game/catalog";

/**
 * The traveler turns to face the visitor, using the same front sprites as
 * the arrival celebration. The cup arm is cut at the shoulder and carries
 * this city's own cup, so every destination keeps its drink.
 */
export function FrontPose({
  recipe,
  mode,
}: {
  recipe: Recipe;
  mode: "wave" | "selfie";
}) {
  const cup = "/art/" + recipe.city + "/cup.webp",
    path = "/art/traveler/";
  return (
    <div className={"front-pose " + mode} aria-hidden="true">
      <div className="front-back">
        <img src={cup} alt="" />
      </div>
      <div className="front-face">
        <div className="front-bob">
          <img className="front-body" src={path + "wave-body.webp"} alt="" />
          <img className="front-raise" src={path + "wave-arm.webp"} alt="" />
          {mode === "selfie" && (
            <svg className="front-phone" viewBox="0 0 30 50">
              <rect
                x="2"
                y="2"
                width="26"
                height="46"
                rx="6"
                fill="#ef7a6f"
                stroke="#1e1a1a"
                strokeWidth="2.6"
              />
              <rect
                x="6"
                y="6"
                width="11"
                height="12"
                rx="3.5"
                fill="#2b2626"
              />
              <circle cx="11.5" cy="10" r="2.6" fill="#7c8a99" />
              <circle cx="11.5" cy="15.4" r="1.6" fill="#7c8a99" />
              <path
                d="M21 9 v26"
                stroke="#fff6"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          <div className="front-cup-arm">
            <img className="front-arm" src={path + "wave-body.webp"} alt="" />
            <img className="front-cup" src={cup} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clip outlines shared by the DOM pose and the postcard (percent of the sprite). */
export const frontClips = {
  body: [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
    [0, 48],
    [24, 48],
    [38, 52],
    [45, 46],
    [43, 40],
    [23, 35],
    [20, 16],
    [0, 16],
  ],
  arm: [
    [11, 34],
    [21, 31],
    [36, 39],
    [43, 40],
    [45, 46],
    [38, 52],
    [12, 42],
    [9, 38],
  ],
} as const;
