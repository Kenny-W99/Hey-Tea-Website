import { useEffect, useRef } from "react";
import { listenHand } from "./input";
export function HandCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let held = false;
    return listenHand((hand) => {
      const dot = cursor.current;
      if (!dot) return;
      dot.hidden = !hand;
      if (!hand) {
        held = false;
        return;
      }
      const x = hand.point.x * innerWidth,
        y = hand.point.y * innerHeight;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
      dot.dataset.held = String(hand.pinch);
      if (hand.pinch && !held) {
        const button = document.elementFromPoint(x, y)?.closest("button");
        if (button && !button.disabled && !button.hasAttribute("data-manual"))
          button.click();
      }
      held = hand.pinch;
    });
  }, []);
  return <div className="handcursor" ref={cursor} hidden aria-hidden="true" />;
}
