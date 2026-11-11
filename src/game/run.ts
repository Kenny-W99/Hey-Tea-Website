import { recipes, type City } from "./catalog";
import { clamp } from "./progress";
export type Scene =
  "globe" | "choose" | "station" | "reveal" | "explore" | "final";
export interface Run {
  scene: Scene;
  city: City;
  step: number;
  progress: number;
  distance: number;
}
export const initial: Run = {
  scene: "globe",
  city: "miami",
  step: 0,
  progress: 0,
  distance: 0,
};
export type Action =
  | { type: "restore"; run: Run }
  | { type: "enter" | "next" | "explore" | "replay" | "finish" | "leave" }
  | { type: "walk"; distance: number }
  | { type: "select"; city: City }
  | { type: "advance"; delta: number };
export function reduceRun(s: Run, a: Action): Run {
  switch (a.type) {
    case "restore":
      return restore(JSON.stringify(a.run));
    case "enter":
      return s.scene === "globe" ? { ...s, scene: "choose" } : s;
    case "select":
      return s.scene === "choose"
        ? { ...initial, scene: "station", city: a.city }
        : s;
    case "advance":
      return s.scene === "station" && Number.isFinite(a.delta) && a.delta > 0
        ? { ...s, progress: clamp(s.progress + a.delta + 0.000000001) }
        : s;
    case "next":
      if (s.scene !== "station" || s.progress < 1) return s;
      return s.step + 1 < recipes[s.city].steps.length
        ? { ...s, step: s.step + 1, progress: 0 }
        : { ...s, scene: "reveal" };
    case "explore":
      return s.scene === "reveal" ? { ...s, scene: "explore" } : s;
    case "walk": {
      if (s.scene !== "explore" || !Number.isFinite(a.distance)) return s;
      const end = recipes[s.city].stops.length,
        bounded = clamp(a.distance, 0, end),
        distance =
          bounded > s.distance && bounded >= end - 0.015 ? end : bounded;
      return s.distance === distance ? s : { ...s, distance };
    }
    case "finish":
      return s.scene === "explore" && s.distance >= recipes[s.city].stops.length
        ? { ...s, scene: "final" }
        : s;
    case "leave":
      return s.scene === "explore"
        ? { ...initial, scene: "choose", city: s.city }
        : s;
    case "replay":
      return s.scene === "final" ? { ...initial, scene: "choose" } : s;
  }
}
export function restore(data: string | null): Run {
  try {
    const s = JSON.parse(data || "null");
    if (
      s &&
      Object.hasOwn(recipes, s.city) &&
      ["globe", "choose", "station", "reveal", "explore", "final"].includes(
        s.scene,
      ) &&
      Number.isInteger(s.step) &&
      s.step >= 0 &&
      s.step < recipes[s.city as City].steps.length &&
      Number.isFinite(s.progress) &&
      s.progress >= 0 &&
      s.progress <= 1
    ) {
      const end = recipes[s.city as City].stops.length;
      const legacy =
        Number.isInteger(s.stop) &&
        s.stop >= 0 &&
        s.stop < end &&
        typeof s.discovered === "boolean";
      const distance = Number.isFinite(s.distance)
        ? clamp(s.distance, 0, end)
        : legacy
          ? s.stop +
            (s.discovered
              ? 1
              : clamp((Number.isInteger(s.paces) ? s.paces : 0) / 3))
          : 0;
      return {
        scene: s.scene,
        city: s.city,
        step: s.step,
        progress: s.progress,
        distance,
      };
    }
  } catch {
    /* Unavailable or incompatible checkpoint. */
  }
  return { ...initial };
}
