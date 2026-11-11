import type { Hand } from "../camera/gestures";

/** Things the traveler can do when stopped, on a held one-hand gesture or a button. */
export type TravelAction = "sit" | "sip" | "wave" | "selfie";

export const travelActions: readonly {
  id: TravelAction;
  gesture: string;
  sign: string;
  label: string;
}[] = [
  { id: "sit", gesture: "Closed_Fist", sign: "✊", label: "Sit" },
  { id: "sip", gesture: "Thumb_Up", sign: "👍", label: "Sip" },
  { id: "wave", gesture: "Open_Palm", sign: "🖐", label: "Wave" },
  { id: "selfie", gesture: "Victory", sign: "✌️", label: "Selfie" },
];
const byGesture = new Map(travelActions.map((a) => [a.gesture, a.id]));

/** How long a sign must be held, and the quiet time after two-hand steering. */
export const holdMs = 600;
export const settleMs = 1200;

/**
 * Turns a held one-hand sign into a single action. Holding the sign longer
 * never repeats it; the hand must change sign first. Signs arm only once
 * two-hand steering has been quiet for settleMs. Steering uses open palms,
 * so the palm left in view after lowering one hand is ignored until the
 * hand changes sign or leaves the frame.
 */
export class ActionGestures {
  private candidate = "";
  private since = 0;
  private fired = "";
  private quietFrom = -Infinity;
  private afterSteering = false;

  reset() {
    this.candidate = this.fired = "";
    this.afterSteering = false;
  }

  /** Call while both hands are steering. */
  steering(now: number) {
    this.reset();
    this.quietFrom = now + settleMs;
    this.afterSteering = true;
  }

  sample(hand: Hand | null, now: number): TravelAction | null {
    const sign = hand?.gesture ?? "";
    if (this.afterSteering && sign) {
      this.afterSteering = false;
      if (sign === "Open_Palm") {
        this.candidate = this.fired = sign;
        return null;
      }
    } else if (!hand) this.afterSteering = false;
    if (sign !== this.candidate) {
      this.candidate = sign;
      this.since = now;
      if (sign !== this.fired) this.fired = "";
    }
    const action = byGesture.get(sign);
    if (
      !action ||
      this.fired === sign ||
      now < this.quietFrom ||
      now - this.since < holdMs
    )
      return null;
    this.fired = sign;
    return action;
  }
}
