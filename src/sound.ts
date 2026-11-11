// Short synthesised cues, created only after an explicit sound-button press.
let context: AudioContext | undefined;
let enabled = false;
export async function toggleSound() {
  if (enabled) {
    enabled = false;
    await context?.suspend();
    return false;
  }
  try {
    context ??= new AudioContext();
    await context.resume();
    enabled = true;
    cue("step");
    return true;
  } catch {
    return false;
  }
}
export function cue(kind: "step" | "travel" | "ready") {
  if (!enabled || !context || document.hidden) return;
  const now = context.currentTime,
    osc = context.createOscillator(),
    gain = context.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(
    kind === "ready" ? 660 : kind === "travel" ? 390 : 480,
    now,
  );
  osc.frequency.exponentialRampToValueAtTime(
    kind === "ready" ? 880 : 620,
    now + 0.11,
  );
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(now);
  osc.stop(now + 0.18);
}
