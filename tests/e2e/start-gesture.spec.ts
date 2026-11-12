import { test, expect } from "@playwright/test";

test.use({
  permissions: ["camera"],
  launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream"] },
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test("Start pinch stays aligned and tolerates finger closure at " + viewport.width, async ({ page, context }) => {
    await page.setViewportSize(viewport);
    await context.route("**/vision/worker.js", route => route.fulfill({
      contentType: "text/javascript",
      body: `let sample={points:[]};const ch=new BroadcastChannel('start-hand');
      ch.onmessage=e=>sample=e.data;
      self.onmessage=({data})=>{
        if(data.type==='init'){self.postMessage({type:'initialized'});return;}
        data.frame.close();self.postMessage({type:'result',...sample});
      };`,
    }));
    await page.goto("/art/routes.json");
    await page.evaluate(() => sessionStorage.setItem("heytea-summer-v1", JSON.stringify({
      scene: "explore", step: 6, city: "hawaii", stop: 0, discovered: false, progress: 0,
    })));
    await page.goto("/");
    await page.getByRole("button", { name: "Enable Camera" }).click();
    const start = page.getByRole("button", { name: "Start", exact: true });
    await expect(start).toBeVisible();
    await start.scrollIntoViewIfNeeded();
    async function hand(x: number, y: number, pinch: boolean) {
      await page.evaluate(({ x, y, pinch }) => {
        const u = .9 - .8 * x / innerWidth, v = .1 + .8 * y / innerHeight;
        const points = Array.from({ length: 21 }, () => ({ x: u, y: v }));
        points[5] = { x: u - .07, y: v };
        points[17] = { x: u + .07, y: v };
        points[4] = { x: pinch ? u : u + .13, y: v };
        const channel = new BroadcastChannel("start-hand");
        channel.postMessage({ points }); channel.close();
      }, { x, y, pinch });
    }
    const r = (await start.boundingBox())!;
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await hand(x, y, false);
    await expect(start).toHaveClass(/gesture-target/);
    const cursor = page.locator(".handcursor");
    await expect(cursor).toBeVisible();
    expect(await cursor.evaluate(el => el.matches(":popover-open"))).toBe(true);
    await page.waitForTimeout(250);
    const dot = (await cursor.boundingBox())!;
    expect(Math.abs(dot.x + dot.width / 2 - x)).toBeLessThan(2);
    expect(Math.abs(dot.y + dot.height / 2 - y)).toBeLessThan(2);
    await page.screenshot({ path: "output/playwright/start-palette-" + viewport.width + ".png" });
    // Move just beyond the padded target as the fingers close.
    await hand(r.x + r.width + 90, y, true);
    await expect(page.locator(".explore-intro")).toHaveCount(0);
    await expect(page.locator(".world canvas")).toBeVisible();
  });
}

test("Start still accepts a mouse click", async ({ page }) => {
  await page.goto("/art/routes.json");
  await page.evaluate(() => sessionStorage.setItem("heytea-summer-v1", JSON.stringify({
    scene: "explore", step: 6, city: "hawaii", stop: 0, discovered: false, progress: 0,
  })));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue Without Camera" }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".explore-intro")).toHaveCount(0);
  await expect(page.locator(".world canvas")).toBeVisible();
});
