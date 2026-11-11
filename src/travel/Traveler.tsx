import type { Recipe } from "../game/catalog";
import { Arrival } from "./Arrival";
import { FrontPose } from "./FrontPose";
import type { TravelAction } from "./actions";

const activities: Record<Recipe["city"], readonly string[]> = {
  miami: ["look", "sit", "sip", "look"],
  hawaii: ["sit", "toast", "sip", "look"],
  la: ["wave", "skate", "sit", "sip"],
};
// Each city's printed seated pose carries its own cup; it is reused at every stop.
const seatedPose: Record<Recipe["city"], number> = {
  miami: 1,
  hawaii: 0,
  la: 2,
};
// A seat that suits each stop: a stone ledge or a wooden bench.
const seats: Record<Recipe["city"], readonly string[]> = {
  miami: ["stone", "stone", "bench", "bench"],
  hawaii: ["stone", "bench", "bench", "stone"],
  la: ["stone", "bench", "stone", "bench"],
};
const description: Record<string, string> = {
  selfie: "Turning around for a selfie",
  sit: "Sitting down for a tea break",
  sip: "Taking a sip of tea",
  look: "Looking up at the scenery",
  toast: "Raising a cup toward the lighthouse",
  wave: "Turning around to wave hello",
  skate: "Hopping on the skateboard",
};

export function Traveler({
  recipe,
  section,
  resting,
  arriving,
  action,
  onArrivalComplete,
}: {
  recipe: Recipe;
  section: number;
  resting: boolean;
  arriving: boolean;
  action: TravelAction | null;
  onArrivalComplete: () => void;
}) {
  const activity = arriving
    ? "arriving"
    : (action ?? (resting ? activities[recipe.city][section] : "walking"));
  const boardwalk = recipe.city === "la" && section === 1,
    path = "/art/traveler/";
  const scenePose = activity === "sit" || activity === "toast";
  const idleRear = activity === "sip" || activity === "look";
  return (
    <div
      className="traveler"
      role="img"
      data-activity={activity}
      data-riding={boardwalk && activity === "walking"}
      aria-label={
        arriving
          ? "Celebrating " + recipe.place + " with " + recipe.name
          : activity !== "walking"
            ? description[activity] + " at " + recipe.stops[section].name
            : boardwalk
              ? "Skating along the Venice bike path"
              : "Following the traveler through " + recipe.place
      }
    >
      <div className="traveler-body">
        <img src={"/art/" + recipe.city + "/cup.webp"} alt="" />
      </div>
      {arriving && <Arrival recipe={recipe} onComplete={onArrivalComplete} />}
      {boardwalk && activity === "walking" && (
        // Side-on ride along the Venice bike path, from the printed pose.
        <div className="traveler-pose skate-ride" aria-hidden="true">
          <img className="pose-base" src={path + "board.webp"} alt="" />
          <img className="pose-part" src={path + "skater.webp"} alt="" />
        </div>
      )}
      {idleRear && (
        <div className="traveler-rear-rest" aria-hidden="true">
          <img className="rear-layer" src={path + "sip-body.webp"} alt="" />
          <div className="sip-hand">
            <img className="rear-layer" src={path + "sip-arm.webp"} alt="" />
            <img
              className="rest-cup"
              src={"/art/" + recipe.city + "/cup.webp"}
              alt=""
            />
          </div>
        </div>
      )}
      {scenePose && (
        <div
          className={"traveler-pose city-pose " + activity}
          aria-hidden="true"
        >
          {activity === "sit" && (
            <div className={"rest-stool " + seats[recipe.city][section]}>
              <i />
            </div>
          )}
          <img
            src={
              "/art/" +
              recipe.city +
              "/" +
              (activity === "sit" ? seatedPose[recipe.city] : section) +
              "-pose.webp"
            }
            alt=""
          />
        </div>
      )}
      {(activity === "wave" || activity === "selfie") && (
        <FrontPose recipe={recipe} mode={activity} />
      )}
      {activity === "skate" && (
        <div className="traveler-pose skate" aria-hidden="true">
          <img className="pose-base" src={path + "board.webp"} alt="" />
          <img className="pose-part" src={path + "skater.webp"} alt="" />
        </div>
      )}
    </div>
  );
}
