import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { listenHand } from "../camera/input";
import { FruitController, clamp, type Input } from "./progress";
import { KitchenMotion } from "./handMotion";
import type { Mechanic } from "./catalog";
import type { Point } from "../camera/gestures";
export function useStationInput(
  el: RefObject<HTMLDivElement | null>,
  mode: Mechanic,
  advance: (n: number) => void,
  enabled: boolean,
) {
  const pointer = useRef<Point>({ x: 0.5, y: 0.5 }),
    engaged = useRef(false),
    flow = useRef(0);
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!node || !enabled) return;
    const controller = new FruitController(mode);
    const motion = new KitchenMotion(mode);
    let pointerId: number | null = null,
      frame = 0,
      time = performance.now();
    const cancel = () => {
      pointerId = null;
      engaged.current = false;
      flow.current = 0;
      controller.cancel();
      motion.reset();
    };
    const input = (a: Input) => {
      if ("point" in a) pointer.current = a.point;
      const delta = controller.input(a);
      if (delta > 0) advance(delta);
    };
    const pos = (x: number, y: number) => {
      const r = node.getBoundingClientRect();
      return { x: (x - r.left) / r.width, y: (y - r.top) / r.height };
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || pointerId !== null) return;
      e.preventDefault();
      motion.reset();
      pointerId = e.pointerId;
      engaged.current = true;
      flow.current = mode === "pour" ? 1 : 0;
      node.setPointerCapture(e.pointerId);
      input({ type: "start", point: pos(e.clientX, e.clientY) });
    };
    const move = (e: PointerEvent) => {
      if (pointerId === e.pointerId)
        input({ type: "drag", point: pos(e.clientX, e.clientY) });
    };
    const up = (e: PointerEvent) => {
      if (pointerId === e.pointerId) {
        input({ type: "end", point: pos(e.clientX, e.clientY) });
        cancel();
      }
    };
    const unlisten = listenHand((h) => {
      setTracked(Boolean(h));
      if (pointerId !== null) return;
      const delta = motion.sample(h, performance.now());
      flow.current = motion.flow;
      engaged.current = Boolean(
        h &&
        (mode === "pour"
          ? motion.flow > 0
          : mode === "squeeze"
            ? h.fist || delta > 0
            : true),
      );
      if (h) pointer.current = h.motionPoint;
      if (delta > 0) advance(delta);
    });
    const tick = (now: number) => {
      input({ type: "tick", seconds: clamp((now - time) / 1000, 0, 0.12) });
      time = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", cancel);
    node.addEventListener("lostpointercapture", cancel);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      cancel();
      unlisten();
      cancelAnimationFrame(frame);
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", cancel);
      node.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [el, mode, advance, enabled]);
  return { pointer, engaged, tracked, flow };
}
