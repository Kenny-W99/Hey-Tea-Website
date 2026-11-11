import { useEffect, useRef } from "react";

// Registered layers share the 640px canvas of the original fruit photos.
// body is the fruit's bounding box on that canvas.
interface FruitMeta {
  body: [number, number, number, number];
  squareness: number;
  inner: [string, string];
  rim: string;
  lip: string;
  crown?: { x: number; y: number };
}
const fruits: Record<string, FruitMeta> = {
  pineapple: {
    body: [161, 255, 474, 630],
    squareness: 2.6,
    inner: ["#f9e08a", "#dcae3e"],
    rim: "#9c6c24",
    lip: "#fdeeb0",
    crown: { x: 169, y: 8 },
  },
  "prickly-pear": {
    body: [124, 15, 508, 625],
    squareness: 2.1,
    inner: ["#f8b2c3", "#dc6b8d"],
    rim: "#d23d5e",
    lip: "#ffd0dc",
  },
  orange: {
    body: [52, 57, 580, 594],
    squareness: 2,
    inner: ["#fff0d8", "#f5b46e"],
    rim: "#ee8418",
    lip: "#fff6e8",
  },
};
// The same original mascot, in source pixels: where the hands grip and the
// point between the feet that stays planted.
const pull = { w: 164, h: 223, grip: [9, 107], foot: [100, 222] } as const;
const cheer = { w: 182, h: 238, foot: [91, 237] } as const;

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function PeelBoard({
  fruit,
  progress,
}: {
  fruit: string;
  progress: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    target = useRef(progress);
  target.current = progress;
  useEffect(() => {
    const el = canvas.current!,
      ctx = el.getContext("2d");
    const meta = fruits[fruit];
    if (!ctx || !meta) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const names = [
      fruit + "-peel-flesh",
      fruit + "-peel-skin",
      "peel-pull",
      "peel-cheer",
      ...(meta.crown ? ["pineapple-peel-crown"] : []),
    ];
    const imgs = names.map((name) => {
      const im = new Image();
      im.src = "/art/fruit/" + name + ".webp";
      return im;
    });
    const [flesh, skin, pullArt, cheerArt, crownArt] = imgs;
    const layer = document.createElement("canvas"),
      lctx = layer.getContext("2d")!;
    let alive = true,
      frame = 0,
      last = performance.now(),
      shown = target.current,
      effort = 0,
      phase = 0,
      doneAt = target.current >= 1 ? -Infinity : -1;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const goal = target.current;
      const before = shown;
      shown = reduced.matches
        ? goal
        : shown + (goal - shown) * (1 - Math.exp(-dt / 0.12));
      if (Math.abs(goal - shown) < 0.0005) shown = goal;
      const q = shown;
      const speed = dt > 0 ? (q - before) / dt : 0;
      effort += (clamp(speed * 2.2) - effort) * (1 - Math.exp(-dt / 0.18));
      phase += (q - before) * 34;
      if (goal >= 1 && q > 0.985 && doneAt === -1) doneAt = now;
      if (goal < 1) doneAt = -1;
      const release =
        doneAt === -1 ? 0 : doneAt === -Infinity ? 1 : (now - doneAt) / 1000;

      const w = el.clientWidth,
        h = el.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
      if (
        el.width !== Math.round(w * dpr) ||
        el.height !== Math.round(h * dpr)
      ) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Layout: fruit left of centre, the helper works from its right side.
      const S = Math.min(w * 0.64, h * 0.78),
        k = S / 640,
        ground = h * 0.87;
      const [bx0, by0, bx1, by1] = meta.body;
      const imgLeft = w * 0.37 - ((bx0 + bx1) / 2) * k,
        imgTop = ground - by1 * k;
      const L = imgLeft + bx0 * k,
        R = imgLeft + bx1 * k,
        T = imgTop + by0 * k,
        B = imgTop + by1 * k;
      const cx = (L + R) / 2,
        cy = (T + B) / 2,
        rx = (R - L) / 2,
        ry = (B - T) / 2,
        n = meta.squareness;
      const half = (y: number) => {
        const d = Math.min(1, Math.abs((y - cy) / ry));
        return rx * Math.pow(1 - Math.pow(d, n), 1 / n);
      };

      // The peel line wraps the fruit and dips on the side being pulled.
      const crownPhase = meta.crown ? 0.1 : 0;
      const eq = clamp((q - crownPhase) / (1 - crownPhase));
      const e = -0.09 + 1.17 * eq;
      const edgeY = (x: number) => {
        const u = (x - L) / (R - L);
        return (
          T +
          (e +
            0.05 * Math.sin(Math.PI * clamp(u)) +
            0.07 * smooth(0.45, 1, u)) *
            (B - T)
        );
      };
      const curve = (from: number, to: number) => {
        const pts: [number, number][] = [];
        for (let i = 0; i <= 28; i++) {
          const x = from + ((to - from) * i) / 28;
          pts.push([x, edgeY(x)]);
        }
        return pts;
      };
      const wide = curve(L - S * 0.1, R + S * 0.1);

      ctx.fillStyle = "#7a5a3b22";
      ctx.beginPath();
      ctx.ellipse(cx, ground, rx * 1.05, S * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();

      // Peeled fruit above the line, skin below it.
      // The flesh layer is composed offscreen so the lip's shadow stays on the fruit.
      if (layer.width !== el.width || layer.height !== el.height) {
        layer.width = el.width;
        layer.height = el.height;
      }
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, w, h);
      lctx.save();
      lctx.beginPath();
      lctx.moveTo(L - S * 0.1, imgTop - S * 0.1);
      lctx.lineTo(R + S * 0.1, imgTop - S * 0.1);
      for (let i = wide.length - 1; i >= 0; i--) lctx.lineTo(...wide[i]);
      lctx.closePath();
      lctx.clip();
      lctx.drawImage(flesh, imgLeft, imgTop, S, S);
      if (e > -0.05 && e < 1.05) {
        lctx.globalCompositeOperation = "source-atop";
        lctx.translate(0, -S * 0.01);
        lctx.strokeStyle = "rgba(92, 52, 14, 0.28)";
        lctx.lineWidth = S * 0.045;
        lctx.filter = "blur(" + S * 0.014 + "px)";
        lctx.beginPath();
        wide.forEach(([x, y], i) =>
          i ? lctx.lineTo(x, y) : lctx.moveTo(x, y),
        );
        lctx.stroke();
        lctx.filter = "none";
      }
      lctx.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      wide.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineTo(R + S * 0.1, imgTop + S * 1.1);
      ctx.lineTo(L - S * 0.1, imgTop + S * 1.1);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(skin, imgLeft, imgTop, S, S);
      ctx.restore();

      if (e > -0.04 && e < 1.02) {
        const span = half(edgeY(cx)) * 0.97;
        const lip = curve(cx - span, cx + span);
        ctx.lineCap = "round";
        ctx.strokeStyle = meta.lip;
        ctx.lineWidth = Math.max(2, S * 0.013);
        ctx.beginPath();
        lip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.strokeStyle = meta.rim;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(1, S * 0.004);
        ctx.beginPath();
        lip.forEach(([x, y], i) =>
          i ? ctx.lineTo(x, y + S * 0.007) : ctx.moveTo(x, y + S * 0.007),
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (meta.crown && crownArt && q < crownPhase + 0.02) {
        const t = clamp(q / crownPhase);
        const cwide = crownArt.naturalWidth * k,
          chigh = crownArt.naturalHeight * k;
        ctx.save();
        ctx.globalAlpha = 1 - smooth(0.55, 1, t);
        ctx.translate(
          imgLeft + meta.crown.x * k + cwide / 2 - t * S * 0.12,
          imgTop +
            meta.crown.y * k +
            chigh -
            Math.sin(t * Math.PI * 0.6) * S * 0.14,
        );
        ctx.rotate(-t * 0.75);
        ctx.drawImage(crownArt, -cwide / 2, -chigh, cwide, chigh);
        ctx.restore();
      }

      // The helper steps back as the skin comes away and leans into the pull.
      const charH = S * 0.42,
        sc = charH / pull.h;
      const still = reduced.matches;
      const bob = still ? 0 : -Math.abs(Math.sin(phase)) * charH * 0.035;
      const lean = still
        ? 0.04
        : 0.03 + 0.1 * effort + 0.012 * Math.sin(now / 520);
      const gripRise = (pull.foot[1] - pull.grip[1]) * sc;
      const back = S * 0.15 * (1 - Math.pow(1 - q, 1.6));
      const feetX =
        cx +
        half(ground - gripRise) +
        S * 0.035 +
        back +
        (pull.foot[0] - pull.grip[0]) * sc;
      const gx = (pull.grip[0] - pull.foot[0]) * sc,
        gy = (pull.grip[1] - pull.foot[1]) * sc;
      const hand = {
        x: feetX + gx * Math.cos(lean) - gy * Math.sin(lean),
        y: ground + bob + gx * Math.sin(lean) + gy * Math.cos(lean),
      };

      // The removed skin: a curling ribbon from the peel line to the hands.
      const flapFade = 1 - smooth(0.45, 0.95, release);
      if (eq > 0 && flapFade > 0) {
        const mid = cx + half(edgeY(cx + rx * 0.6)) * 0.6;
        const root = { x: mid, y: edgeY(mid) };
        const rootHalf =
          Math.max(half(root.y), rx * 0.6) * 0.46 * clamp(eq * 6);
        const drop = smooth(0, 0.4, release);
        const tip = {
          x: hand.x + drop * S * 0.03,
          y: hand.y + drop * (ground - S * 0.025 - hand.y),
        };
        const base = {
          x: root.x + drop * (cx + rx * 0.7 - root.x),
          y: root.y + drop * (ground - S * 0.02 - root.y),
        };
        const c1 = {
          x: base.x + S * 0.03,
          y: Math.min(ground - S * 0.03, base.y + S * (0.17 - drop * 0.1)),
        };
        const c2 = { x: tip.x - S * 0.13, y: tip.y + S * (0.05 - drop * 0.04) };
        const at = (s: number) => {
          const m = 1 - s;
          return {
            x:
              m * m * m * base.x +
              3 * m * m * s * c1.x +
              3 * m * s * s * c2.x +
              s * s * s * tip.x,
            y:
              m * m * m * base.y +
              3 * m * m * s * c1.y +
              3 * m * s * s * c2.y +
              s * s * s * tip.y,
          };
        };
        const left: [number, number][] = [],
          right: [number, number][] = [];
        for (let i = 0; i <= 24; i++) {
          const s = i / 24,
            p = at(s),
            p2 = at(Math.min(1, s + 0.01)),
            p1 = at(Math.max(0, s - 0.01));
          let tx = p2.x - p1.x,
            ty = p2.y - p1.y;
          const len = Math.hypot(tx, ty) || 1;
          tx /= len;
          ty /= len;
          const width =
            rootHalf +
            (S * 0.042 * clamp(eq * 6) - rootHalf) * Math.pow(s, 0.8);
          // A slight twist makes the strip read as a curling peel.
          const twist = 1 - 0.35 * Math.sin(s * Math.PI);
          left.push([p.x - ty * width * twist, p.y + tx * width * twist]);
          right.push([p.x + ty * width * twist, p.y - tx * width * twist]);
        }
        ctx.save();
        ctx.globalAlpha = flapFade;
        const fill = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
        fill.addColorStop(0, meta.inner[1]);
        fill.addColorStop(0.35, meta.inner[0]);
        fill.addColorStop(1, meta.inner[1]);
        ctx.fillStyle = fill;
        ctx.strokeStyle = meta.rim;
        ctx.lineWidth = Math.max(1.5, S * 0.006);
        ctx.lineJoin = "round";
        ctx.beginPath();
        left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(...right[i]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = Math.max(1, S * 0.005);
        ctx.beginPath();
        for (let i = 2; i <= 20; i++) {
          const [lx, ly] = left[i],
            [rx2, ry2] = right[i];
          const x = lx + (rx2 - lx) * 0.32,
            y = ly + (ry2 - ly) * 0.32;
          if (i === 2) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (q < 0.04 && !still) {
        // The campaign's yellow arrow: pull from the top, down to the hands.
        const a = 1 - q / 0.04,
          sway = Math.sin(now / 380) * S * 0.008;
        const x0 = cx + rx * 0.45,
          y0 = T + S * 0.02;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = "#f4c21d";
        ctx.lineWidth = Math.max(3, S * 0.012);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0 + sway);
        ctx.quadraticCurveTo(
          hand.x + S * 0.02,
          y0 + S * 0.02 + sway,
          hand.x - S * 0.01,
          hand.y - S * 0.12 + sway,
        );
        ctx.stroke();
        const ax = hand.x - S * 0.01,
          ay = hand.y - S * 0.12 + sway;
        ctx.beginPath();
        ctx.moveTo(ax - S * 0.03, ay - S * 0.03);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax + S * 0.032, ay - S * 0.022);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "#7a5a3b26";
      ctx.beginPath();
      ctx.ellipse(feetX, ground, charH * 0.3, S * 0.022, 0, 0, Math.PI * 2);
      ctx.fill();
      if (release > 0) {
        const hop = still
          ? 0
          : Math.sin(Math.PI * clamp(release / 0.42)) * charH * 0.14 +
            Math.sin(Math.PI * clamp((release - 0.48) / 0.3)) * charH * 0.05;
        const ch = charH * (cheer.h / pull.h) * 0.98,
          cs = ch / cheer.h;
        ctx.drawImage(
          cheerArt,
          feetX - cheer.foot[0] * cs,
          ground - hop - cheer.foot[1] * cs,
          cheer.w * cs,
          cheer.h * cs,
        );
        // Happy marks and a sparkle, as on the original peeling page.
        const show = smooth(0.05, 0.3, release);
        ctx.save();
        ctx.globalAlpha = show;
        ctx.strokeStyle = "#f4c21d";
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(2.5, S * 0.01);
        const hx = feetX + ch * 0.05,
          hy = ground - hop - ch * 1.02;
        for (let j = 0; j < 3; j++) {
          const ang = -2.2 + j * 0.55,
            r0 = ch * 0.12,
            r1 = ch * 0.2;
          ctx.beginPath();
          ctx.moveTo(hx + Math.cos(ang) * r0, hy + Math.sin(ang) * r0);
          ctx.lineTo(hx + Math.cos(ang) * r1, hy + Math.sin(ang) * r1);
          ctx.stroke();
        }
        const sx = L + rx * 0.25,
          sy = T + ry * 0.12,
          r = S * 0.045 * (0.85 + 0.15 * Math.sin(now / 260));
        ctx.fillStyle = "#f4c21d";
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const ang = (j * Math.PI) / 4 - Math.PI / 2,
            rr = j % 2 ? r * 0.28 : r;
          ctx.lineTo(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(feetX, ground + bob);
        ctx.rotate(lean);
        ctx.drawImage(
          pullArt,
          -pull.foot[0] * sc,
          -pull.foot[1] * sc,
          pull.w * sc,
          pull.h * sc,
        );
        ctx.restore();
      }
      el.dataset.peeled = q.toFixed(3);
      frame = requestAnimationFrame(draw);
    };
    void Promise.all(imgs.map((im) => im.decode()))
      .then(() => {
        if (!alive) return;
        el.dataset.ready = "true";
        last = performance.now();
        frame = requestAnimationFrame(draw);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [fruit]);
  return (
    <div className="station-render peel-board">
      <img
        className="cut-backup"
        src={"/art/fruit/" + fruit + "-" + (progress >= 1 ? 2 : 0) + ".webp"}
        alt=""
      />
      <canvas
        ref={canvas}
        role="img"
        aria-label="The HEYTEA helper peels the fruit as you pull"
      />
    </div>
  );
}
