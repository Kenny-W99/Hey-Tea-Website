import { useEffect, useRef, useState, type RefObject } from "react";
import { Traveler } from "./Traveler";
import type { TravelAction } from "./actions";
import { composePostcard } from "./postcard";
import type { MeshPlane } from "pixi.js";
import type { Recipe } from "../game/catalog";
import { clamp } from "../game/progress";
import {
  advanceStride,
  approachProgress,
  boxDisparity,
  cameraAt,
  zoomOf,
  routes,
  secondsPerLandmark,
  steeringDistance,
  viewAt,
} from "./movement";

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// The traveler's feet stay on this line; the camera keeps the path under them.
const groundLine = 0.045;

export interface WalkControl {
  target: number;
  position: number;
  direction: number;
  handAxis: number;
  handTime: number;
}

export function World({
  recipe,
  control,
  checkpoint,
  arriving,
  action,
  onActionEnd,
  onArrivalComplete,
}: {
  recipe: Recipe;
  control: RefObject<WalkControl>;
  checkpoint: (position: number) => void;
  arriving: boolean;
  /** A gesture or button action shown until the traveler moves again. */
  action: TravelAction | null;
  onActionEnd: () => void;
  onArrivalComplete: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    terrain = useRef<HTMLDivElement>(null);
  const posters = useRef<(HTMLDivElement | null)[]>([]);
  const gpu = useRef<(() => void) | null>(null);
  const drag = useRef<{ id: number; y: number } | null>(null);
  const total = recipe.stops.length;
  const acting = useRef<{ action: TravelAction | null; end: () => void }>({
    action,
    end: onActionEnd,
  });
  acting.current = { action, end: onActionEnd };
  const [postcard, setPostcard] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [actor, setActor] = useState({
    section: Math.min(total - 1, Math.floor(control.current.position)),
    resting: false,
  });

  useEffect(() => {
    const stage = root.current!,
      walk = control.current;
    let frame = 0,
      previous = performance.now(),
      lastDraw = -Infinity,
      saved = walk.position,
      lastMotion = performance.now(),
      lastSection = -1,
      wasResting = false,
      stride = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (now: number) => {
      const dt = clamp((now - previous) / 1000, 0, 0.08);
      previous = now;
      const motion = walk.direction
        ? (walk.direction * dt) / secondsPerLandmark
        : steeringDistance(walk.handAxis, now - walk.handTime, dt);
      if (!walk.direction && now - walk.handTime > 250 && walk.handAxis) {
        walk.handAxis = 0;
        walk.target = walk.position;
      }
      walk.target = clamp(walk.target + motion, 0, total);
      const gap = walk.target - walk.position;
      const before = walk.position;
      walk.position =
        Math.abs(gap) < 0.001
          ? walk.target
          : walk.position + gap * (1 - Math.exp(-dt * 16));
      if (
        walk.target > before &&
        walk.position >= total - 0.015 &&
        walk.target >= total - 0.015
      )
        walk.position = walk.target = total;
      const d = walk.position;
      const v = viewAt(d, total),
        section = v.blend > 0.5 ? v.next : v.section;
      if (walk.direction || Math.abs(d - before) > 0.00008) {
        lastMotion = now;
        // Walking again ends a sit, sip, wave or selfie.
        if (acting.current.action) acting.current.end();
      }
      const resting = now - lastMotion > 1100;
      if (resting !== wasResting || section !== lastSection) {
        wasResting = resting;
        lastSection = section;
        setActor({ section, resting });
      }
      if (
        before !== d ||
        lastDraw === -Infinity ||
        (d === walk.target && lastDraw !== d)
      ) {
        for (let i = 0; i < total; i++) {
          const el = posters.current[i];
          if (!el) continue;
          el.style.opacity =
            i === v.section ? "1" : i === v.next ? String(v.blend) : "0";
          if (i === v.section || i === v.next)
            el.style.transform = reduced.matches
              ? "none"
              : "scale(" +
                (1 +
                  0.9 *
                    approachProgress(
                      i === v.section ? v.progress : v.nextProgress,
                    )) +
                ")";
        }
        stride = advanceStride(stride, d - before, dt);
        const phase = stride * Math.PI * 2;
        const moving = !reduced.matches && Math.abs(d - before) > 0.0001;
        stage.style.setProperty(
          "--stride",
          reduced.matches ? "0%" : (Math.floor(stride * 8) * 100) / 7 + "%",
        );
        stage.style.setProperty(
          "--bob",
          (moving ? -Math.abs(Math.sin(phase)) * 1.8 : 0) + "px",
        );
        stage.style.setProperty(
          "--lean",
          (moving ? Math.sin(phase) * 1.1 : 0) + "deg",
        );
        stage.dataset.distance = d.toFixed(3);
        if (d !== before)
          stage.dataset.heading = d > before ? "forward" : "back";
        gpu.current?.();
        // Draw one last idle frame to settle the traveler's posture.
        lastDraw = moving && d === walk.target ? -Infinity : d;
      }
      if (Math.abs(d - saved) >= 0.043 || (d === walk.target && saved !== d)) {
        saved = d;
        checkpoint(d);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [control, checkpoint, total]);

  const section = actor.section;
  useEffect(() => {
    if (action !== "selfie") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Snap once the traveler has turned and raised the phone.
    const timer = window.setTimeout(
      () => {
        const stage = root.current;
        if (!stage) return;
        if (!reduced) setFlash((n) => n + 1);
        const url = composePostcard(
          stage,
          recipe,
          recipe.stops[section].name,
          gpu.current ?? undefined,
        );
        if (url) setPostcard(url);
      },
      reduced ? 250 : 1150,
    );
    return () => window.clearTimeout(timer);
  }, [action, recipe, section]);

  useEffect(() => {
    const mount = terrain.current!;
    let dead = false,
      dispose = () => {};
    async function setup() {
      const [{ Application, MeshPlane, BlurFilter }, { leaseTextures }] =
        await Promise.all([import("pixi.js"), import("../game/textures")]);
      if (dead) return;
      const app = new Application();
      await app.init({
        preference: "webgl",
        autoStart: false,
        backgroundAlpha: 0,
        antialias: true,
        // Full Retina detail on larger screens; phones keep the lighter budget.
        resolution: Math.min(devicePixelRatio, innerWidth > 700 ? 2 : 1.5),
        autoDensity: true,
      });
      if (dead) {
        app.destroy(true);
        return;
      }
      // A dense mesh follows the box's perspective closely as near
      // surfaces pass the camera.
      const cols = 81,
        rows = 61;
      const plan = routes[recipe.city],
        nearness = plan.map((r) => {
          const out = new Float32Array(cols * rows);
          for (let j = 0; j < out.length; j++)
            out[j] = boxDisparity(
              r,
              (j % cols) / (cols - 1),
              Math.floor(j / cols) / (rows - 1),
            );
          return out;
        });
      const leases = recipe.stops.map((_, i) =>
        leaseTextures(["/art/" + recipe.city + "/" + i + "-scene.webp"]),
      );
      const meshes: MeshPlane[] = [];
      const blurs: InstanceType<typeof BlurFilter>[] = [];
      let width = 0,
        height = 0;
      function draw() {
        const w = width,
          h = height;
        if (!w || !h) return;
        const v = viewAt(control.current.position, recipe.stops.length);
        const current = meshes[v.section],
          next = meshes[v.next];
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        app.canvas.style.visibility = current && next ? "visible" : "hidden";
        let lane = 0;
        // Hold each picture, then cross over in the middle of the overlap.
        const swap = smoothstep(0.2, 0.8, v.blend);
        meshes.forEach((mesh, i) => {
          mesh.visible = i === v.section || i === v.next;
          if (!mesh.visible && mesh.filters) mesh.filters = null;
          if (!mesh.visible) return;
          const r = plan[i],
            plate = mesh.texture,
            raw = nearness[i];
          const blend = i === v.section ? 1 - v.blend : v.blend;
          const progress = i === v.section ? v.progress : v.nextProgress;
          const approach = approachProgress(progress) * (reduced ? 0.12 : 1);
          const cam = cameraAt(
            r,
            approach,
            { w, h, ground: h * (1 - groundLine) },
            { w: plate.width, h: plate.height },
          );
          lane += cam.lane * blend;
          const fv = r.vanish[1];
          const buffer = mesh.geometry.getBuffer("aPosition"),
            coords = buffer.data as Float32Array;
          for (let j = 0; j < raw.length; j++) {
            const k = zoomOf(raw[j], cam);
            coords[j * 2] =
              cam.ex + ((j % cols) / (cols - 1) - cam.fx) * cam.width * k;
            coords[j * 2 + 1] =
              cam.ey +
              (Math.floor(j / cols) / (rows - 1) - fv) * cam.height * k;
          }
          // The next stop dissolves in over the whole frame while both
          // cameras keep moving forward, like one continuous walk.
          mesh.alpha = i === v.section ? 1 : swap;
          // A brief forward-motion blur at the crossover reads as one quick
          // push-through instead of two pictures overlapping.
          const softness = reduced ? 0 : Math.sin(Math.PI * swap) * 1.4;
          if (softness > 0.2) {
            blurs[i] ??= new BlurFilter({ strength: 0, quality: 2 });
            blurs[i].strength = softness;
            mesh.filters = [blurs[i]];
          } else if (mesh.filters) mesh.filters = null;
          buffer.update();
        });
        if (current && next) {
          root.current?.style.setProperty("--lane", (lane / w) * 100 + "%");
          root.current?.style.setProperty("--ground", groundLine * 100 + "%");
        }
        app.render();
      }
      const resize = () => {
        width = mount.clientWidth;
        height = mount.clientHeight;
        if (width && height) app.renderer.resize(width, height);
        draw();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(mount);
      gpu.current = draw;
      mount.appendChild(app.canvas);
      resize();
      dispose = () => {
        gpu.current = null;
        observer.disconnect();
        app.destroy(true, { children: true });
        leases.forEach((l) => l.release());
      };
      await Promise.all(
        leases.map(async (lease, i) => {
          try {
            const [plate] = await lease.ready;
            if (dead) return;
            const mesh = new MeshPlane({
              texture: plate,
              verticesX: cols,
              verticesY: rows,
            });
            meshes[i] = mesh;
            app.stage.addChild(mesh);
            mesh.zIndex = i;
            app.stage.sortChildren();
            draw();
          } catch {
            /* The DOM panorama covers unavailable textures. */
          }
        }),
      );
    }
    void setup().catch(() => {
      if (!dead) {
        dispose();
        dispose = () => {};
      }
    });
    return () => {
      dead = true;
      dispose();
    };
  }, [recipe, control]);

  return (
    <div
      ref={root}
      className="world continuous-world"
      aria-label={recipe.place + " walking route"}
      onPointerDown={(e) => {
        if (arriving || e.button !== 0) return;
        drag.current = { id: e.pointerId, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const point = drag.current;
        if (arriving || point?.id !== e.pointerId) return;
        control.current.target = clamp(
          control.current.target +
            ((point.y - e.clientY) /
              Math.max(220, e.currentTarget.clientHeight)) *
              0.72,
          0,
          total,
        );
        point.y = e.clientY;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      {recipe.stops.map((stop, i) => (
        <div
          className="route-plate"
          ref={(el) => {
            posters.current[i] = el;
          }}
          key={stop.name}
          style={{
            opacity: i === 0 ? 1 : 0,
            transformOrigin:
              routes[recipe.city][i].vanish[0] * 100 +
              "% " +
              routes[recipe.city][i].vanish[1] * 100 +
              "%",
          }}
        >
          <img
            src={"/art/" + recipe.city + "/" + i + "-scene.webp"}
            alt=""
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const el = posters.current[i];
              if (el) {
                el.classList.add("travel-backup");
                el.style.backgroundImage = ["front", "mid", "back"]
                  .map(
                    (n) =>
                      "url(/art/" + recipe.city + "/" + i + "-" + n + ".webp)",
                  )
                  .join(",");
              }
            }}
          />
        </div>
      ))}
      <div ref={terrain} className="terrain" aria-hidden="true" />
      <Traveler
        recipe={recipe}
        section={actor.section}
        resting={actor.resting}
        arriving={arriving}
        action={arriving ? null : action}
        onArrivalComplete={onArrivalComplete}
      />
      {flash > 0 && (
        <div key={flash} className="selfie-flash" aria-hidden="true" />
      )}
      {postcard && (
        <figure
          className="selfie-postcard"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <img
            src={postcard}
            alt={"Selfie postcard from " + recipe.stops[section].name}
          />
          <figcaption>
            <a
              className="secondary"
              href={postcard}
              download={"heytea-" + recipe.city + "-selfie.jpg"}
            >
              Save postcard
            </a>
            <button
              className="secondary"
              aria-label="Close postcard"
              onClick={() => setPostcard(null)}
            >
              ×
            </button>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
