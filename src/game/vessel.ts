import type { Graphics } from "pixi.js";
import type { Mechanic } from "./catalog";
interface Vessel {
  x: number;
  y: number;
  width: number;
  height: number;
  progress: number;
  color: string;
  mode: Mechanic;
  angle: number;
  active: boolean;
  impact: number;
  flow?: number;
}
// Paths share a local coordinate system: y=0 is the rim, y=1 the base.
// At each height the curved bowl has a narrower interior span.
export function drawVessel(g: Graphics, v: Vessel) {
  const {
    x,
    y,
    width: w,
    height: h,
    progress: p,
    color,
    mode,
    angle,
    active,
    impact,
  } = v;
  const left = x - w / 2,
    right = x + w / 2;
  g.moveTo(left, y)
    .quadraticCurveTo(left + w * 0.04, y + h, x, y + h)
    .quadraticCurveTo(right - w * 0.04, y + h, right, y)
    .quadraticCurveTo(x, y - h * 0.16, left, y)
    .fill({ color: 0xfffbeb, alpha: 0.8 })
    .stroke({ color: 0x805d49, width: 2 });
  const fill =
    mode === "pour"
      ? 0.25 + 0.68 * p
      : mode === "stir"
        ? 0.93
        : mode === "transfer"
          ? 0.16 + 0.5 * p
          : 0.24 + (mode === "mash" ? 0.22 * p : 0);
  const sy = y + h * (1 - fill),
    ratio = Math.sqrt(fill),
    half = w * 0.46 * ratio;
  g.moveTo(x - half, sy)
    .quadraticCurveTo(x - half * 0.86, y + h * 0.95, x, y + h * 0.95)
    .quadraticCurveTo(x + half * 0.86, y + h * 0.95, x + half, sy)
    .ellipse(x, sy, half, Math.max(2, h * 0.072 * ratio))
    .fill({ color, alpha: 0.9 });
  for (let i = 0; i < (mode === "transfer" ? Math.ceil(p * 12) : 10); i++) {
    const a = i * 2.4 + (mode === "stir" ? angle : 0);
    const rx = x + Math.sin(a) * half * 0.68,
      ry = sy + Math.cos(a) * h * 0.04;
    g.ellipse(
      rx,
      ry,
      w * 0.024 * (1 - (mode === "mash" ? p * 0.6 : 0)),
      h * 0.039,
    ).fill(i % 2 ? 0xe67735 : 0xffda71);
  }
  g.moveTo(left, y)
    .quadraticCurveTo(x, y + h * 0.14, right, y)
    .stroke({ color: 0x916e5b, width: 2 });
  if (mode === "stir") {
    const tipX = x + Math.cos(angle) * half * 0.44,
      tipY = sy + Math.sin(angle) * h * 0.055;
    g.moveTo(tipX, tipY)
      .lineTo(tipX + w * 0.12, tipY - h * 0.94)
      .stroke({ color: 0x8b633c, width: Math.max(4, w * 0.033), cap: "round" });
    g.ellipse(tipX, tipY, w * 0.05, h * 0.055).fill(0xd8ad6d);
  }
  if (mode === "mash" && impact > 0.05) {
    for (let i = 0; i < 5; i++)
      g.circle(
        x + (i - 2) * w * 0.09,
        y - h * (1 - impact) * (0.35 + (i % 2) * 0.2),
        w * 0.018 * impact,
      ).fill(color);
  }
  if (mode === "pour" && active) {
    const phase = p * 95;
    g.ellipse(x, sy, w * (0.054 + 0.016 * Math.sin(phase)), h * 0.026).stroke({
      color: 0xffe4a2,
      width: 1.6,
    });
    g.moveTo(x + w * 0.37, y - h * 0.85)
      .quadraticCurveTo(x + w * 0.13, y - h * 0.61, x, sy)
      .stroke({
        color: 0xf3b938,
        width: Math.max(2, w * (0.012 + 0.034 * (v.flow ?? 1))),
        cap: "round",
      });
  }
}
