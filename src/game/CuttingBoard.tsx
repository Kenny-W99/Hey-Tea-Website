import { useEffect, useRef } from "react";

export function CuttingBoard({
  fruit,
  progress,
}: {
  fruit: string;
  progress: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    desired = useRef(0),
    initial = useRef(progress);
  const invalidate = useRef<(() => void) | null>(null);
  useEffect(() => {
    invalidate.current?.();
  }, [progress]);
  desired.current = Math.min(4, Math.floor(progress * 4 + 1e-6));
  useEffect(() => {
    const el = canvas.current!,
      ctx = el.getContext("2d");
    if (!ctx) return;
    let alive = true,
      frame = 0,
      shown = Math.min(4, Math.floor(initial.current * 4 + 1e-6)),
      start = -1;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const files = [
      fruit + "-0",
      fruit + "-1",
      fruit + (fruit === "guava" ? "-2" : "-1"),
      "helper-body",
      "helper-knife",
    ];
    const imgs = files.map((name) => {
      const im = new Image();
      im.src = "/art/fruit/" + name + ".webp";
      return im;
    });
    const draw = (now: number) => {
      if (shown < desired.current && start < 0) start = now;
      const t = start < 0 ? 0 : Math.min(1, (now - start) / 350);
      const swing = reduced.matches ? 0 : Math.sin(t * Math.PI);
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
      const size = Math.min(w * 0.51, h * 0.53),
        x = w * 0.43,
        ground = h * 0.68;
      ctx.fillStyle = "#99735320";
      ctx.beginPath();
      ctx.ellipse(x, ground, size * 0.52, size * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      const stage = start >= 0 && t > 0.48 ? Math.min(4, shown + 1) : shown;
      const picture = imgs[stage < 2 ? 0 : stage === 4 ? 2 : 1];
      const sc = size / Math.max(picture.width, picture.height),
        fw = picture.width * sc,
        fh = picture.height * sc;
      const top = ground - fh,
        centerY = top + fh / 2;
      const columns = stage < 2 || (stage === 4 && fruit === "guava") ? 1 : 2,
        rows = stage >= 3 && (stage === 3 || fruit !== "guava") ? 2 : 1;
      const scatter = columns > 1 ? 1 : 0;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const width = fw / columns,
            height = fh / rows,
            dir = col === 0 ? -1 : 1;
          const hop = stage >= 2 ? swing * size * 0.035 : 0;
          ctx.save();
          ctx.translate(
            x - fw / 2 + (col + 0.5) * width + dir * scatter * size * 0.034,
            top +
              (row + 0.5) * height -
              hop +
              (rows === 2 ? (row - 0.5) * size * 0.045 : 0),
          );
          ctx.rotate(dir * scatter * (0.035 + 0.04 * swing));
          ctx.drawImage(
            picture,
            (col * picture.width) / columns,
            (row * picture.height) / rows,
            picture.width / columns,
            picture.height / rows,
            -width / 2,
            -height / 2,
            width,
            height,
          );
          ctx.restore();
        }
      if (stage === 1) {
        ctx.fillStyle = fruit === "guava" ? "#e78370" : "#dcca83";
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.05, centerY - fh * 0.34);
        ctx.quadraticCurveTo(
          x + fw * 0.18,
          centerY - fh * 0.07,
          x + fw * 0.13,
          centerY + fh * 0.23,
        );
        ctx.quadraticCurveTo(
          x + fw * 0.13,
          centerY - fh * 0.09,
          x + fw * 0.05,
          centerY - fh * 0.34,
        );
        ctx.fill();
      }
      const helperW = Math.min(w * 0.32, size * 0.66),
        helperH = (helperW * 251) / 214;
      const left = x + size * 0.26,
        up = ground - helperH + swing * helperH * 0.032;
      ctx.save();
      ctx.translate(left, up);
      ctx.scale(helperW / 214, helperH / 251);
      ctx.drawImage(imgs[3], 0, 0, 214, 251);
      ctx.translate(143, 124);
      const lift =
        t < 0.42
          ? -Math.sin(((t / 0.42) * Math.PI) / 2) * 0.26
          : -0.26 + 0.72 * Math.sin(((t - 0.42) / 0.58) * Math.PI);
      ctx.rotate(reduced.matches || start < 0 ? 0 : -lift);
      ctx.translate(-143, -124);
      ctx.drawImage(imgs[4], 0, 0, 214, 251);
      ctx.restore();
      if (stage === 4) {
        ctx.strokeStyle = "#f4c834";
        ctx.lineWidth = Math.max(2, helperW * 0.024);
        ctx.lineCap = "round";
        for (let j = 0; j < 3; j++) {
          const a = -2.45 + j * 0.44,
            s = helperW * 0.12;
          const hx = left + helperW * 0.78,
            hy = up + helperH * 0.08;
          ctx.beginPath();
          ctx.moveTo(hx + Math.cos(a) * s, hy + Math.sin(a) * s);
          ctx.lineTo(hx + Math.cos(a) * s * 1.85, hy + Math.sin(a) * s * 1.85);
          ctx.stroke();
        }
      }
      if (t > 0.42 && t < 0.9 && !reduced.matches) {
        const fly = (t - 0.42) / 0.48;
        ctx.globalAlpha = 1 - fly;
        ctx.fillStyle = fruit === "guava" ? "#f26e56" : "#e8ba45";
        for (let j = 0; j < 6; j++) {
          const a = (j + 1) * 0.46;
          ctx.beginPath();
          ctx.arc(
            x + fw * 0.29 + Math.cos(a) * size * 0.23 * fly,
            centerY - Math.sin(a) * size * 0.22 * fly,
            size * 0.009,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (t === 1) {
        shown++;
        start = -1;
      }
      frame =
        shown < desired.current || t === 1 ? requestAnimationFrame(draw) : 0;
    };
    const observer = new ResizeObserver(() => invalidate.current?.());
    void Promise.all(imgs.map((im) => im.decode()))
      .then(() => {
        if (alive) {
          el.dataset.ready = "true";
          invalidate.current = () => {
            if (!frame) frame = requestAnimationFrame(draw);
          };
          observer.observe(el);
          invalidate.current();
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      invalidate.current = null;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [fruit]);
  return (
    <div className="station-render cutting-board">
      <img
        className="cut-backup"
        src={
          "/art/fruit/" +
          fruit +
          "-" +
          (progress >= 1 && fruit === "guava" ? 2 : progress >= 0.5 ? 1 : 0) +
          ".webp"
        }
        alt=""
      />
      <canvas
        ref={canvas}
        role="img"
        aria-label="The HEYTEA helper cuts beside your fruit"
      />
    </div>
  );
}
