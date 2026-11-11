import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { Recipe, Step } from "./catalog";
import { drawVessel } from "./vessel";
import type { Point } from "../camera/gestures";
export function StationArt({
  recipe,
  step,
  progress,
  pointer,
  engaged,
  flow,
  portionAt,
  prepared = [],
}: {
  recipe: Recipe;
  step: Step;
  progress: number;
  pointer: RefObject<Point>;
  engaged: RefObject<boolean>;
  flow: RefObject<number>;
  portionAt: RefObject<number>;
  /** For the bowl step: the fruits cut or peeled earlier, added one by one. */
  prepared?: readonly { fruit: string; peeled: boolean }[];
}) {
  const el = useRef<HTMLDivElement>(null),
    current = useRef(progress);
  current.current = progress;
  const [loaded, setLoaded] = useState(false);
  const fruit = step.fruit,
    phase = step.mode;
  const base = fruit
    ? "/art/fruit/" + fruit + "-"
    : "/art/" + recipe.city + "/";
  const fruitStages =
    phase === "squeeze" || phase === "scoop" ? [1, 1, 2] : [0, 1, 2];
  const tool = phase === "pour" ? "pitcher" : phase === "stir" ? "mix" : "mash";
  // Each fruit as it was left: peeled whole, the guava pieces, or the
  // opened halves the cutting board finished on.
  const preparedUrls = prepared.map(
    (f) =>
      "/art/fruit/" +
      f.fruit +
      (f.peeled || f.fruit === "guava" ? "-2" : "-1") +
      ".webp",
  );
  const urls =
    phase === "scoop"
      ? ["/art/fruit/scoop-scene.webp"]
      : phase === "transfer"
        ? preparedUrls
        : fruit
          ? fruitStages.map((n) => base + n + ".webp")
          : [base + tool + ".webp"];
  const helperFile =
    phase === "transfer" || phase === "squeeze" ? "helper-" + phase : null;
  const helperUrl = helperFile ? "/art/fruit/" + helperFile + ".webp" : null;
  const key = [...urls, ...(helperUrl ? [helperUrl] : [])].join("|");
  useEffect(() => {
    const root = el.current;
    if (!root) return;
    let dead = false,
      cleanup = () => {};
    setLoaded(false);
    async function draw() {
      const { Application, Sprite, Graphics } = await import("pixi.js");
      const app = new Application();
      await app.init({
        resizeTo: root!,
        backgroundAlpha: 0,
        antialias: true,
        preference: "webgl",
        resolution: Math.min(devicePixelRatio, 1.5),
        autoDensity: true,
      });
      const dispose = () => app.destroy(true, { children: true });
      if (dead) {
        dispose();
        return;
      }
      cleanup = dispose;
      const { leaseTextures } = await import("./textures");
      if (dead) return;
      const lease = leaseTextures(key.split("|"));
      cleanup = () => {
        dispose();
        lease.release();
      };
      const textures = await lease.ready;
      if (dead) return;
      root!.appendChild(app.canvas);
      const sprites = textures.slice(0, helperUrl ? -1 : undefined).map((t) => {
        const s = new Sprite(t);
        s.anchor.set(0.5);
        app.stage.addChild(s);
        return s;
      });
      const fx = new Graphics();
      app.stage.addChild(fx);
      const helper = helperUrl ? new Sprite(textures.at(-1)!) : null;
      if (helper) {
        helper.anchor.set(0.5, 1);
        app.stage.addChild(helper);
      }
      let previousProgress = current.current,
        impactAt = -1000,
        liquid = current.current;
      app.ticker.add(() => {
        const w = app.screen.width,
          h = app.screen.height,
          p = current.current;
        const cx = w * 0.5,
          cy = h * 0.5;
        if (p !== previousProgress) {
          impactAt = performance.now();
          previousProgress = p;
        }
        const impact = Math.max(0, 1 - (performance.now() - impactAt) / 520);
        const elapsed = performance.now() - portionAt.current;
        const stream =
          phase === "pour" && p < 1
            ? Math.max(flow.current, elapsed < 360 ? 0.68 : 0)
            : 0;
        liquid += (p - liquid) * (1 - Math.exp(-app.ticker.deltaMS / 95));
        const index =
          fruit && phase !== "scoop" ? Math.min(2, Math.floor(p * 2.999)) : 0;
        sprites.forEach((s, i) => {
          const size = Math.min(w * 0.72, h * 0.77);
          const scale = size / Math.max(s.texture.width, s.texture.height);
          s.scale.set(scale);
          s.position.set(cx, cy);
          s.alpha = i === index ? 1 : 0;
          if (fruit && phase !== "scoop" && p < 1) {
            const blend = p * 2;
            s.alpha =
              i === Math.floor(blend)
                ? 1 - (blend % 1)
                : i === Math.floor(blend) + 1
                  ? blend % 1
                  : 0;
          }
          if (helper && phase !== "transfer") {
            s.scale.set(scale * 0.86);
            s.x = cx - w * 0.1;
          }
          if (phase === "squeeze") {
            s.scale.x *= 1 - 0.14 * Math.max(impact, engaged.current ? 1 : 0);
          }
          if (phase === "mash") {
            s.scale.y *= 1 - 0.08 * impact;
            s.y += impact * size * 0.025;
          }
          if (phase === "pour") {
            s.x = cx + w * 0.04;
            s.y = cy - h * 0.02;
          }
          if (phase === "stir") {
            const swing = engaged.current
              ? Math.sin(pointer.current.x * 19) * 0.055 +
                Math.cos(pointer.current.y * 16) * 0.04
              : impact * 0.06;
            s.rotation = swing;
            s.x = cx + swing * w * 0.14;
            s.y = cy - h * 0.01 + Math.abs(swing) * h * 0.08;
          }
          if (phase === "transfer") {
            // The newest added fruit falls into the bowl, then the next one
            // waits above it. Fruits already in the bowl are hidden.
            const n = sprites.length,
              added = Math.min(n, Math.floor(p * n + 1e-6));
            const drop = Math.min(1, (performance.now() - impactAt) / 650);
            const falling = drop < 1 && added > 0 && i === added - 1;
            const waiting = i === added && added < n;
            s.alpha = falling
              ? 1 - Math.max(0, (drop - 0.8) / 0.2)
              : waiting
                ? added > 0 && drop < 1
                  ? Math.max(0, (drop - 0.55) / 0.45)
                  : 1
                : 0;
            s.scale.set(scale * (falling ? 0.35 - drop * 0.13 : 0.35));
            s.position.set(
              cx - w * 0.08 * (falling ? 1 - drop : 1),
              cy - h * 0.04 + (falling ? drop * drop * h * 0.25 : 0),
            );
          }
          if (phase === "scoop") {
            s.y += impact * h * 0.012;
            s.rotation = impact * 0.025;
          }
          if (phase === "pour") s.rotation = stream * 0.085;
        });
        if (helper) {
          const helperHeight = Math.min(h * 0.36, w * 0.37);
          helper.scale.set(helperHeight / helper.texture.height);
          const effort =
            phase === "squeeze"
              ? Math.max(impact, engaged.current ? 1 : 0)
              : impact;
          helper.position.set(
            w * (phase === "transfer" ? 0.24 : 0.73),
            h * (phase === "transfer" ? 0.7 : 0.71),
          );
          helper.rotation = (phase === "transfer" ? 1 : -1) * effort * 0.07;
          helper.y += effort * h * 0.009;
        }
        fx.clear();
        if (phase === "transfer") {
          const width = Math.min(w * 0.5, h * 0.7);
          drawVessel(fx, {
            x: cx,
            y: h * 0.69,
            width,
            height: width * 0.37,
            progress: p,
            color: recipe.color,
            mode: phase,
            angle: 0,
            active: false,
            impact: 0,
          });
        }
        if (phase === "pour" || phase === "stir") {
          const size = Math.min(w * 0.72, h * 0.77);
          const bw = phase === "pour" ? size * 0.52 : size * 0.75;
          const bx = phase === "pour" ? cx - size * 0.2 : cx;
          const by = phase === "pour" ? cy + size * 0.035 : cy + h * 0.01;
          if (phase === "stir") {
            for (let i = 0; i < 28; i++) {
              const a = (i * Math.PI) / 14;
              fx.circle(
                cx + Math.cos(a) * w * 0.32,
                cy + Math.sin(a) * h * 0.34,
                2.2,
              ).fill({ color: 0x45634c, alpha: 0.55 });
            }
          }
          if (phase === "pour")
            drawVessel(fx, {
              x: bx,
              y: by,
              width: bw,
              height: bw * 0.48,
              progress: liquid,
              flow: stream,
              color: recipe.color,
              mode: phase,
              angle: 0,
              active: stream > 0,
              impact,
            });
        }
        if (phase === "mash" && impact > 0.05) {
          for (let i = 0; i < 6; i++)
            fx.circle(
              cx - w * 0.19 + i * w * 0.03,
              cy - h * 0.06 - h * (1 - impact) * (0.1 + (i % 3) * 0.06),
              impact * w * 0.007,
            ).fill(recipe.color);
        }
        if (phase === "pour" || phase === "stir" || phase === "mash") {
          const y = h * 0.9,
            wide = Math.min(155, w * 0.34);
          fx.roundRect(cx - wide / 2, y, wide, 6, 3).fill({
            color: 0x374739,
            alpha: 0.15,
          });
          if (p > 0)
            fx.roundRect(cx - wide / 2, y, wide * p, 6, 3).fill(recipe.color);
          if (phase === "stir" && engaged.current) {
            fx.circle(pointer.current.x * w, pointer.current.y * h, 8).stroke({
              color: 0x216455,
              width: 3,
            });
          }
        }
      });
      setLoaded(true);
    }
    draw().catch(() => {
      if (!dead) setLoaded(false);
    });
    return () => {
      dead = true;
      cleanup();
    };
  }, [
    key,
    phase,
    fruit,
    helperUrl,
    recipe.color,
    pointer,
    engaged,
    flow,
    portionAt,
  ]);
  return (
    <div
      className="station-render"
      ref={el}
      data-helper={helperFile || (phase === "scoop" ? "scoop-scene" : tool)}
    >
      {!loaded && (
        <img
          draggable={false}
          className="art-fallback"
          src={
            urls[
              Math.min(
                urls.length - 1,
                phase === "transfer"
                  ? Math.floor(progress * urls.length + 1e-6)
                  : Math.floor(progress * 2.999),
              )
            ]
          }
          alt=""
        />
      )}
      {!loaded && helperUrl && (
        <img className="helper-fallback" src={helperUrl} alt="" />
      )}
    </div>
  );
}
