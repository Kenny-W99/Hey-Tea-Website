import type { Recipe } from "../game/catalog";
import { frontClips } from "./FrontPose";

/**
 * Compose the selfie: the visible scene behind the traveler, the traveler
 * facing the camera (the phone itself stays out of shot), and a caption.
 * Everything is drawn from same-origin images already on the page, so the
 * result is a local data URL and nothing leaves the browser.
 */
export function composePostcard(
  stage: HTMLElement,
  recipe: Recipe,
  stop: string,
  renderScene?: () => void,
): string | null {
  const box = stage.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const W = 720,
    H = 560,
    pad = 24,
    photoW = W - pad * 2,
    photoH = 420;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(0, 0, W, H);

  // Crop around the traveler at the photo's aspect.
  const traveler = stage.querySelector(".traveler")?.getBoundingClientRect();
  const cropW = Math.min(box.width, box.height * (photoW / photoH)),
    cropH = cropW * (photoH / photoW);
  const center = traveler
    ? traveler.left + traveler.width / 2 - box.left
    : box.width / 2;
  const cropX = Math.max(0, Math.min(box.width - cropW, center - cropW / 2)),
    cropY = box.height - cropH;
  const scale = photoW / cropW;
  const toPhoto = (r: DOMRect) => ({
    x: pad + (r.left - box.left - cropX) * scale,
    y: pad + (r.top - box.top - cropY) * scale,
    w: r.width * scale,
    h: r.height * scale,
  });

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad, pad, photoW, photoH);
  ctx.clip();
  renderScene?.();
  const scene = stage.querySelector<HTMLCanvasElement>(".terrain canvas");
  if (scene && scene.style.visibility !== "hidden" && scene.width) {
    // Read the WebGL canvas in the same task as its render.
    const sx = scene.width / box.width;
    ctx.drawImage(
      scene,
      cropX * sx,
      cropY * sx,
      cropW * sx,
      cropH * sx,
      pad,
      pad,
      photoW,
      photoH,
    );
  } else {
    const poster = [
      ...stage.querySelectorAll<HTMLImageElement>(".route-plate img"),
    ].find((img) => img.parentElement?.style.opacity === "1");
    if (poster?.naturalWidth) {
      const r = toPhoto(poster.getBoundingClientRect());
      const cover = Math.max(
        r.w / poster.naturalWidth,
        r.h / poster.naturalHeight,
      );
      const dw = poster.naturalWidth * cover,
        dh = poster.naturalHeight * cover;
      ctx.drawImage(poster, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
    }
  }
  const part = (selector: string, clip?: readonly (readonly number[])[]) => {
    const img = stage.querySelector<HTMLImageElement>(selector);
    if (!img?.complete || !img.naturalWidth) return;
    const r = toPhoto(img.getBoundingClientRect());
    ctx.save();
    if (clip) {
      ctx.beginPath();
      clip.forEach(([px, py], i) => {
        const x = r.x + (px / 100) * r.w,
          y = r.y + (py / 100) * r.h;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
    }
    if (selector === ".front-cup") {
      // object-fit: contain inside its box.
      const fit = Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight);
      const dw = img.naturalWidth * fit,
        dh = img.naturalHeight * fit;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate((-6 * Math.PI) / 180);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else ctx.drawImage(img, r.x, r.y, r.w, r.h);
    ctx.restore();
  };
  part(".front-body", frontClips.body);
  part(".front-raise");
  part(".front-arm", frontClips.arm);
  part(".front-cup");
  ctx.restore();

  ctx.strokeStyle = "#e7dccb";
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, photoW, photoH);
  ctx.fillStyle = "#2f4a35";
  ctx.font = '30px "Short Stack", cursive';
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Greetings from " + recipe.place + "!", pad + 4, H - 52);
  ctx.fillStyle = "#6c7466";
  ctx.font = '16px "Short Stack", cursive';
  ctx.fillText(stop + " · " + recipe.name, pad + 6, H - 22);
  ctx.textAlign = "right";
  ctx.fillStyle = "#2f4a35";
  ctx.font = '15px "Short Stack", cursive';
  ctx.fillText("HEYTEA", W - pad - 4, H - 22);
  try {
    return out.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}
