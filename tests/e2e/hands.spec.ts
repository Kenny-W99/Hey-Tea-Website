import { test, expect, type Locator } from "@playwright/test";
import {
  preparedFruits,
  recipes,
  type City,
} from "../../src/game/catalog";
test.use({
  permissions: ["camera"],
  launchOptions: {
    args: ["--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream"],
  },
});
for (const city of Object.keys(recipes) as City[]) {
  test(
    "camera recipe and two-hand walk through " + city,
    async ({ page, context }) => {
      test.setTimeout(130000);
      // Only the model output is synthetic. Camera acquisition, worker transport,
      // gesture filtering, hit testing, renderer and action reducers stay in use.
      await context.route("**/vision/worker.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: `
      let sample={points:[]}, start=0;
      const ch=new BroadcastChannel('route-hand');ch.onmessage=e=>{sample=e.data;start=performance.now()};
      const palm=(x,y)=>Array.from({length:21},()=>({x,y}));
      self.onmessage=({data})=>{
        if(data.type==='init'){self.postMessage({type:'initialized'});return;}
        data.frame.close();
        if(sample.duration){
          const t=Math.min(1,(performance.now()-start)/sample.duration);
          const gap=sample.from+(sample.to-sample.from)*t;
          const y=sample.y0+(sample.y1-sample.y0)*t;
          self.postMessage({type:'result',points:palm(.5-gap/2,y),second:palm(.5+gap/2,y)});
        }else self.postMessage({type:'result',...sample});
      }
    `,
        }),
      );
      await page.goto("/");
      await page.getByRole("button", { name: "Enable Camera" }).click();
      const viewport = page.viewportSize()!;
      async function hand(
        x: number,
        y: number,
        pose:
          "open" | "pinch" | "fist" | "point" | "tilt" | "thumb" | "victory",
        delay = 210,
        scale = 1,
      ) {
        const u = 0.9 - (0.8 * x) / viewport.width,
          v = 0.1 + (0.8 * y) / viewport.height;
        await page.evaluate(
          ({ u, v, pose, scale }) => {
            const points = Array.from({ length: 21 }, () => ({ x: u, y: v }));
            points[5] = { x: u - 0.07, y: v };
            points[17] = { x: u + 0.07, y: v };
            points[4] = { x: pose === "pinch" ? u : u + 0.13, y: v };
            points[0] = { x: u, y: v + 0.08 };
            points[9] = { x: pose === "tilt" ? u + 0.15 : u, y: v };
            for (const p of points) {
              p.x = u + (p.x - u) * scale;
              p.y = v + (p.y - v) * scale;
            }
            const c = new BroadcastChannel("route-hand");
            c.postMessage({
              points,
              pose: {
                categoryName:
                  pose === "open"
                    ? "Open_Palm"
                    : pose === "fist"
                      ? "Closed_Fist"
                      : pose === "thumb"
                        ? "Thumb_Up"
                        : pose === "victory"
                          ? "Victory"
                          : "None",
                score: 0.99,
              },
            });
            c.close();
          },
          { u, v, pose, scale },
        );
        await page.waitForTimeout(delay);
      }
      async function activate(button: Locator) {
        await expect(button).toBeVisible();
        const r = (await button.boundingBox())!,
          x = r.x + r.width / 2,
          y = r.y + r.height / 2;
        await hand(x, y, "open", 300);
        await hand(x, y, "pinch", 270);
        await hand(x, y, "open", 190);
      }
      const recipe = recipes[city];
      await activate(page.getByRole("button", { name: /Step Into Summer/ }));
      await activate(
        page.getByRole("button", { name: recipe.place + " " + recipe.name }),
      );
      await activate(page.getByRole("button", { name: /Make this drink/ }));
      // Work on the LEFT side of the camera frame, away from the desktop fruit pad.
      const at = (
        x: number,
        y: number,
        pose: Parameters<typeof hand>[2] = "point",
        delay = 240,
        scale = 1,
      ) => hand(x * viewport.width, y * viewport.height, pose, delay, scale);
      for (const step of recipe.steps) {
        await expect(
          page.getByRole("heading", { name: step.title + "." }),
        ).toBeVisible();
        await at(0.19, 0.31);
        switch (step.mode) {
          case "split":
            for (const x of [0.44, 0.18, 0.44, 0.18]) await at(x, 0.32);
            break;
          case "arc":
          case "peel":
            // A slow, continuous pull; lifting back up never peels.
            for (let k = 0; k < 2; k++) {
              for (let s = 0; s <= 14; s++)
                await at(0.22, 0.31 + s * 0.025, "point", 70);
              await at(0.22, 0.31, "point", 120);
            }
            break;
          case "scoop":
          case "transfer": {
            // One sweep for each fruit prepared earlier.
            const drops =
              step.mode === "transfer"
                ? preparedFruits(recipe.steps, recipe.steps.indexOf(step))
                    .length
                : 1;
            for (let j = 0; j < drops; j++) {
              await at(0.22, 0.62, "point", 700);
              await at(0.22, 0.31, "point", 400);
            }
            await expect(page.locator(".progress-label")).toContainText(
              "Step complete",
            );
            break;
          }
          case "squeeze":
            for (let j = 0; j < 2; j++) {
              await at(0.23, 0.43, "fist", 550);
              await at(0.23, 0.43, "open", 400);
              if (j === 0)
                await expect(page.getByText("1 / 2 squeezes")).toBeVisible();
            }
            break;
          case "mash":
            for (let j = 0; j < 3; j++) {
              await at(0.24, 0.6, "point", 400);
              await at(0.24, 0.31, "point", 400);
            }
            break;
          case "pour":
            await at(0.24, 0.46, "tilt", 6500);
            break;
          case "stir":
            for (let j = 0; j <= 46; j++) {
              const a = (j * Math.PI) / 10;
              await at(
                0.24 + 0.105 * Math.cos(a),
                0.47 + 0.14 * Math.sin(a),
                "point",
                105,
              );
            }
        }
      }
      await activate(page.getByRole("button", { name: /Explore Your Summer/ }));
      // How to play comes first; pinch Start like any other button.
      await expect(page.locator(".explore-intro video")).toBeVisible();
      await activate(page.getByRole("button", { name: "Start", exact: true }));
      const world = page.locator(".world");
      async function sweep(
        from: number,
        to: number,
        duration: number,
        y0 = 0.46,
        y1 = y0,
      ) {
        await page.evaluate(
          (message) => {
            const channel = new BroadcastChannel("route-hand");
            channel.postMessage(message);
            channel.close();
          },
          { from, to, duration, y0, y1 },
        );
        await page.waitForTimeout(duration);
      }
      const position = async () =>
        Number(await world.getAttribute("data-distance"));
      await expect(world.locator("canvas")).toBeVisible();
      await sweep(0.43, 0.43, 650);
      await expect(page.getByText("Centered · Paused")).toBeVisible();
      await sweep(0.43, 0.66, 300);
      await page.waitForTimeout(1500);
      const reached = await position();
      expect(reached).toBeGreaterThan(0.16);
      expect(reached).toBeLessThan(0.25);
      await sweep(0.66, 0.43, 300);
      await expect(page.getByText("Centered · Paused")).toBeVisible();
      const paused = await position();
      await page.waitForTimeout(500);
      expect(Math.abs((await position()) - paused)).toBeLessThan(0.01);
      await sweep(0.43, 0.2, 300);
      await page.waitForTimeout(1000);
      expect(await position()).toBeLessThan(paused - 0.1);
      // Lower one hand to stop, then hold a one-hand sign: thumbs up sips.
      const traveler = page.locator(".traveler");
      await hand(viewport.width * 0.5, viewport.height * 0.5, "thumb", 2400);
      await expect(traveler).toHaveAttribute("data-activity", "sip");
      await hand(viewport.width * 0.5, viewport.height * 0.5, "victory", 1900);
      await expect(traveler).toHaveAttribute("data-activity", "selfie");
      await expect(page.locator(".selfie-postcard img")).toBeVisible();
      // Steering again ends the action.
      await sweep(0.43, 0.43, 650);
      await expect(page.getByText("Centered · Paused")).toBeVisible();
      await sweep(0.43, 0.66, 500);
      await expect(traveler).toHaveAttribute("data-activity", "walking");
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 45000 });
      await activate(page.getByRole("button", { name: /Choose another city/ }));
      await expect(
        page.getByRole("heading", { name: "Choose Your Summer." }),
      ).toBeVisible();
      const another = city === "miami" ? "hawaii" : "miami";
      await activate(
        page.getByRole("button", {
          name: recipes[another].place + " " + recipes[another].name,
        }),
      );
      await activate(page.getByRole("button", { name: /Make this drink/ }));
      await expect(
        page.getByRole("heading", {
          name: recipes[another].steps[0].title + ".",
        }),
      ).toBeVisible();
    },
  );
}
