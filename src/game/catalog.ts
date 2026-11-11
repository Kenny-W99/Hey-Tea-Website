export type City = "miami" | "hawaii" | "la";
export type Mechanic =
  | "split"
  | "peel"
  | "arc"
  | "squeeze"
  | "scoop"
  | "transfer"
  | "mash"
  | "pour"
  | "stir";
export interface Step {
  mode: Mechanic;
  title: string;
  instruction: string;
  button: string;
  fruit?: string;
}
export interface Stop {
  name: string;
  action: string;
  pose: string;
}
export interface Recipe {
  city: City;
  place: string;
  name: string;
  fruits: [string, string];
  tea: string;
  color: string;
  stops: Stop[];
  steps: Step[];
}
/**
 * Every fruit cut or peeled before step `index`, once each and in order.
 * The bowl step adds each of them, one drop per fruit.
 */
export function preparedFruits(steps: readonly Step[], index: number) {
  const out: { fruit: string; peeled: boolean }[] = [];
  for (const s of steps.slice(0, index))
    if (
      s.fruit &&
      (s.mode === "split" || s.mode === "peel" || s.mode === "arc") &&
      !out.some((f) => f.fruit === s.fruit)
    )
      out.push({ fruit: s.fruit, peeled: s.mode !== "split" });
  return out;
}
const step = (
  mode: Mechanic,
  title: string,
  instruction: string,
  button: string,
  fruit?: string,
): Step => ({ mode, title, instruction, button, fruit });
const stop = (name: string, action: string, pose: string): Stop => ({
  name,
  action,
  pose,
});
function finish(tea: string): Step[] {
  return [
    step(
      "transfer",
      "Into the bowl",
      "Drag each prepared fruit into the bowl.",
      "Add a fruit",
    ),
    step(
      "mash",
      "Mash the fruit",
      "Press the fruit three times to release its juice.",
      "Mash once",
    ),
    step(
      "pour",
      "Pour the tea",
      "Hold to pour " + tea.toLowerCase() + ". Release to pause.",
      "Add a portion",
    ),
    step(
      "stir",
      "Mix your summer",
      "Trace two circles with the helper. Either direction works.",
      "Stir one turn",
    ),
  ];
}
export const recipes: Record<City, Recipe> = {
  miami: {
    city: "miami",
    place: "Miami",
    name: "Guava Sunset",
    fruits: ["Pink guava", "Key lime"],
    tea: "Jasmine green tea",
    color: "#f6a3ab",
    stops: [
      stop("Tower promenade", "Stroll beneath the palms.", "walk"),
      stop("Waterfront garden", "Sit by the waterfront.", "sit"),
      stop("Beachfront boulevard", "Take a sip by the beach.", "walk"),
      stop("Wynwood Walls", "Explore the painted walls.", "look"),
    ],
    steps: [
      step(
        "split",
        "Split the guava",
        "Drag across the pink guava to open it.",
        "Cut a section",
        "guava",
      ),
      step(
        "split",
        "Halve the key lime",
        "Slide across the lime to reveal its center.",
        "Cut a section",
        "lime",
      ),
      step(
        "squeeze",
        "Squeeze the lime",
        "Squeeze and release twice to juice the lime.",
        "Squeeze once",
        "lime",
      ),
      ...finish("Jasmine green tea"),
    ],
  },
  hawaii: {
    city: "hawaii",
    place: "Hawaii",
    name: "Golden Aloha",
    fruits: ["Lilikoi", "Hawaiian pineapple"],
    tea: "Coconut green tea",
    color: "#f7c649",
    stops: [
      stop("Byodo-In Temple", "Rest by the temple pond.", "sit"),
      stop(
        "Kilauea Point Lighthouse",
        "Lean on the rail above the sea.",
        "lean",
      ),
      stop("Waikiki Beach", "Walk along the palm-lined shore.", "walk"),
      stop("Iolani Palace", "Look up from the palace gate.", "look"),
    ],
    steps: [
      step(
        "peel",
        "Peel the pineapple",
        "Pull the rind down in one smooth motion to uncover the golden fruit.",
        "Peel a little",
        "pineapple",
      ),
      step(
        "split",
        "Open the lilikoi",
        "Drag across the shell to open the lilikoi.",
        "Open a section",
        "lilikoi",
      ),
      step(
        "scoop",
        "Scoop the pulp",
        "Scoop the pulp down into the bowl.",
        "Scoop the pulp",
        "lilikoi",
      ),
      ...finish("Coconut green tea"),
    ],
  },
  la: {
    city: "la",
    place: "Los Angeles",
    name: "Desert Glow",
    fruits: ["Prickly pear", "California orange"],
    tea: "Oolong tea",
    color: "#efa171",
    stops: [
      stop("Hollywood", "Wave beneath the Hollywood sign.", "greet"),
      stop("Venice Beach", "Skate along the promenade.", "skate"),
      stop("Griffith Observatory", "Rest on the observatory wall.", "sit"),
      stop("Santa Monica Pier", "Walk toward the Ferris wheel.", "walk"),
    ],
    steps: [
      step(
        "peel",
        "Peel the prickly pear",
        "Pull the pink skin down to uncover the flesh.",
        "Peel a little",
        "prickly-pear",
      ),
      step(
        "arc",
        "Unwrap the orange",
        "Pull the peel down to unwrap the orange.",
        "Peel a little",
        "orange",
      ),
      ...finish("Oolong tea"),
    ],
  },
};
