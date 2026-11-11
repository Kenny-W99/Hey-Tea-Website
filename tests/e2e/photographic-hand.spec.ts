import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Google's MediaPipe pointing_up.jpg test image, animated in a local canvas.
// Exercise actual model inference with a hand in the video instead of injecting landmarks.
const jpeg = readFileSync("tests/fixtures/pointing-up.jpg").toString("base64");
for (const scene of ["station", "explore"]) {
  test(
    "real MediaPipe recognizes photographic hand movement in " + scene,
    async ({ page }) => {
      await page.addInitScript(
        ({ jpeg, scene }) => {
          sessionStorage.setItem(
            "heytea-summer-v1",
            JSON.stringify({
              scene,
              city: "hawaii",
              step: 0,
              distance: scene === "explore" ? 1.55 : 0,
              stop: 0,
              progress: 0,
              discovered: false,
            }),
          );
          const photo = new Image();
          photo.src = "data:image/jpeg;base64," + jpeg;
          const frame = document.createElement("canvas");
          frame.width = 640;
          frame.height = 480;
          const pen = frame.getContext("2d")!;
          const hand = {
            x: scene === "explore" ? 190 : 270,
            y: 194,
            size: scene === "explore" ? 215 : 290,
          };
          Object.assign(window, { photoHand: hand });
          navigator.mediaDevices.getUserMedia = async () => {
            await photo.decode();
            const paint = () => {
              pen.fillStyle = "#b8b8b2";
              pen.fillRect(0, 0, 640, 480);
              pen.drawImage(
                photo,
                hand.x - hand.size / 2,
                hand.y - hand.size / 2,
                hand.size,
                (hand.size * photo.height) / photo.width,
              );
              if (scene === "explore") {
                pen.save();
                pen.translate(640, 0);
                pen.scale(-1, 1);
                pen.drawImage(
                  photo,
                  hand.x - hand.size / 2,
                  hand.y - hand.size / 2,
                  hand.size,
                  (hand.size * photo.height) / photo.width,
                );
                pen.restore();
              }
            };
            paint();
            const timer = setInterval(paint, 45);
            const stream = frame.captureStream(20);
            stream
              .getVideoTracks()[0]
              .addEventListener("ended", () => clearInterval(timer));
            return stream;
          };
        },
        { jpeg, scene },
      );
      await page.goto("/");
      await page.getByRole("button", { name: "Enable Camera" }).click();
      const move = async (y: number, size: number) => {
        await page.evaluate(
          ({ y, size }) => {
            Object.assign(
              (window as unknown as { photoHand: object }).photoHand,
              { y, size },
            );
          },
          { y, size },
        );
        await page.waitForTimeout(130);
      };
      if (scene === "station") {
        await expect(page.getByText("Hand in view")).toBeVisible({
          timeout: 30000,
        });
        for (let cut = 0; cut < 3; cut++) {
          for (let i = 0; i <= 8; i++) await move(194 + i * 13, 290);
          if (cut < 2)
            for (let i = 1; i <= 8; i++) await move(298 - i * 13, 290);
        }
        await expect(
          page.getByRole("heading", { name: "Open the lilikoi." }),
        ).toBeVisible();
      } else {
        await expect(page.getByText("Centered · Paused")).toBeVisible({
          timeout: 30000,
        });
        const distance = async () =>
          Number(await page.locator(".world").getAttribute("data-distance"));
        const shift = async (x: number) => {
          await page.evaluate(
            (x) =>
              Object.assign(
                (window as unknown as { photoHand: object }).photoHand,
                { x },
              ),
            x,
          );
          await page.waitForTimeout(120);
        };
        const sweep = async (from: number, to: number) => {
          for (let i = 1; i <= 6; i++)
            await shift(from + ((to - from) * i) / 6);
        };
        const still = await distance();
        await page.waitForTimeout(500);
        expect(Math.abs((await distance()) - still)).toBeLessThan(0.01);
        await sweep(190, 140);
        await expect(
          page.getByText("Moving forward", { exact: true }),
        ).toBeVisible();
        const forwardStart = await distance();
        await page.waitForTimeout(1400);
        const forwardTravel = (await distance()) - forwardStart;
        expect(forwardTravel).toBeGreaterThan(0.15);
        expect(forwardTravel).toBeLessThan(0.21);
        await page.screenshot({
          path: "output/playwright/hand-steering-forward.png",
        });
        await sweep(140, 190);
        await expect(page.getByText("Centered · Paused")).toBeVisible();
        const pause = await distance();
        await page.waitForTimeout(600);
        expect(Math.abs((await distance()) - pause)).toBeLessThan(0.01);
        await sweep(190, 240);
        await expect(
          page.getByText("Moving back", { exact: true }),
        ).toBeVisible();
        const backStart = await distance();
        await page.waitForTimeout(1400);
        const backTravel = backStart - (await distance());
        expect(Math.abs(backTravel - forwardTravel)).toBeLessThan(0.03);
        await page.screenshot({
          path: "output/playwright/hand-steering-back.png",
        });
        await sweep(240, 190);
        await expect(page.getByText("Centered · Paused")).toBeVisible();
        await page.getByRole("button", { name: "Recenter hands" }).click();
        await expect(page.getByText("Centered · Paused")).toBeVisible();
        await page.setViewportSize({ width: 320, height: 700 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(320);
        await page.screenshot({
          path: "output/playwright/hand-steering-phone.png",
        });
      }
    },
  );
}
