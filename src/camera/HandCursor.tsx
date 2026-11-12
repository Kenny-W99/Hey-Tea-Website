import { useEffect, useRef } from "react";
import { listenHand } from "./input";

/**
 * How far (in viewport px) a button's hit box is widened when the hand cursor
 * cannot land an exact click. Individual buttons may request a larger pad with
 * `data-gesture-pad` (the Start button in the explore intro does this).
 */
const DEFAULT_PAD = 20;

/** Return the button only when it is a real, clickable gesture target. */
function clickableButton(el: Element | null): HTMLButtonElement | null {
  const button = el?.closest("button");
  if (
    !(button instanceof HTMLButtonElement) ||
    button.disabled ||
    button.hasAttribute("data-manual")
  )
    return null;
  return button;
}

/**
 * Find the button under the hand cursor, tolerating imprecise pointing.
 * Tries an exact hit first (unchanged behaviour), then widens every visible
 * button by its pad and picks the closest containing the cursor.
 */
function findButton(x: number, y: number): HTMLButtonElement | null {
  const modal = document.querySelector("dialog:modal");
  const scope = modal ?? document;

  const exact = clickableButton(document.elementFromPoint(x, y));
  if (exact && (!modal || modal.contains(exact))) return exact;

  let best: HTMLButtonElement | null = null;
  let bestDist = Infinity;
  for (const el of Array.from(scope.querySelectorAll("button"))) {
    const button = clickableButton(el);
    if (!button || !button.checkVisibility()) continue;
    const rect = button.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const pad = Math.max(DEFAULT_PAD, Number(button.dataset.gesturePad || 0));
    const inside =
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad;
    if (!inside) continue;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < bestDist) {
      best = button;
      bestDist = dist;
    }
  }
  return best;
}

export function HandCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let held = false;
    let target: HTMLButtonElement | null = null;
    let aimedStart: HTMLButtonElement | null = null;
    let aimedAt = 0;
    let topModal: Element | null = null;
    const clearTarget = () => {
      target?.classList.remove("gesture-target");
      target = null;
    };
    const off = listenHand((hand) => {
      const dot = cursor.current;
      if (!dot) return;
      dot.hidden = !hand;
      if (!hand) {
        held = false;
        aimedStart = null;
        dot.hidePopover();
        clearTarget();
        return;
      }
      // A z-index cannot rise above a modal dialog. Put the cursor in the
      // viewport top layer so its visible position matches hit testing.
      const modal = document.querySelector("dialog:modal");
      if (modal !== topModal || !dot.matches(":popover-open")) {
        dot.hidePopover();
        dot.showPopover();
        topModal = modal;
      }
      const x = hand.point.x * innerWidth,
        y = hand.point.y * innerHeight;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
      dot.dataset.held = String(hand.pinch);

      let button = findButton(x, y);
      const now = performance.now();
      if (!hand.pinch && button?.matches(".intro-start")) {
        aimedStart = button;
        aimedAt = now;
      }
      // Closing the fingers moves the fingertip. Keep a recent Start aim
      // briefly, but never activate a stale, hidden or distant target.
      if (!button && aimedStart?.isConnected && !aimedStart.disabled &&
          modal?.contains(aimedStart) && aimedStart.checkVisibility() &&
          now - aimedAt <= 350) {
        const r = aimedStart.getBoundingClientRect();
        if (x >= r.left - 120 && x <= r.right + 120 &&
            y >= r.top - 120 && y <= r.bottom + 120) button = aimedStart;
      }
      if (button !== target) {
        target?.classList.remove("gesture-target");
        button?.classList.add("gesture-target");
        target = button;
      }

      if (hand.pinch && !held) {
        if (button) {
          button.click();
          dot.dataset.fired = "true";
          window.setTimeout(() => {
            dot.dataset.fired = "";
          }, 280);
        }
      }
      held = hand.pinch;
    });
    return () => {
      off();
      clearTarget();
    };
  }, []);
  return <div className="handcursor" ref={cursor} popover="manual" hidden aria-hidden="true" />;
}
