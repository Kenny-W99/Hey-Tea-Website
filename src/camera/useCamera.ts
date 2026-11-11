import { useSyncExternalStore } from "react";
import { camera } from "./input";
export function useCamera() {
  return useSyncExternalStore(camera.subscribe, camera.snapshot);
}
