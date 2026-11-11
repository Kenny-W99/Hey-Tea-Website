import { test, expect } from "@playwright/test";
test.use({
  permissions: ["camera"],
  launchOptions: {
    args: ["--enable-unsafe-swiftshader", "--use-fake-device-for-media-stream"],
  },
});
test("grants, checks frames and actual inference, disables and recovers on retry", async ({
  page,
  context,
}) => {
  let rejectFirst = true;
  await context.route("**/vision/gesture_recognizer.task", async (route) => {
    if (rejectFirst) {
      rejectFirst = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enable Camera" }).click();
  await expect(
    page.getByRole("button", { name: "Try Again", exact: true }),
  ).toBeVisible({ timeout: 38000 });
  await page.getByRole("button", { name: "Try Again", exact: true }).click();
  await expect(page.getByText("Camera Ready! Let's Make Summer.")).toBeVisible({
    timeout: 38000,
  });
  await page.screenshot({ path: "output/playwright/entry-ready.png" });
  await expect(page.getByText("Camera on")).toBeVisible();
  await page.getByText("Camera on").click();
  await expect(page.getByText("Camera off")).toBeVisible();
});
test("a deterministic hand sequence drives real fruit manipulation through the input adapter", async ({
  page,
  context,
}) => {
  await context.route("**/vision/worker.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
    let sample={points:[]};const controls=new BroadcastChannel('test-hand')
    controls.onmessage=e=>{sample=e.data}
    self.onmessage=({data})=>{
      if(data.type==='init')self.postMessage({type:'initialized'})
      else {data.frame.close();self.postMessage({type:'result',...sample})}
    }
  `,
    }),
  );
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "station",
        city: "miami",
        step: 0,
        progress: 0,
        stop: 0,
        discovered: false,
      }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Enable Camera" }).click();
  await expect(page.getByText("Split the guava.")).toBeVisible();
  const pad = (await page.locator(".station-pad").boundingBox())!,
    viewport = page.viewportSize()!;
  async function pinch(x: number) {
    const u = 0.9 - (0.8 * (pad.x + pad.width * x)) / viewport.width,
      v = 0.1 + (0.8 * (pad.y + pad.height * 0.48)) / viewport.height;
    await page.evaluate(
      ({ u, v }) => {
        const points = Array.from({ length: 21 }, () => ({ x: u, y: v }));
        points[5] = { x: u - 0.06, y: v };
        points[17] = { x: u + 0.06, y: v };
        const ch = new BroadcastChannel("test-hand");
        ch.postMessage({ points });
        ch.close();
      },
      { u, v },
    );
  }
  await pinch(0.25);
  await expect(page.locator(".handcursor")).toHaveAttribute(
    "data-held",
    "true",
  );
  for (const [i, x] of [0.85, 0.25, 0.85, 0.25].entries()) {
    await pinch(x);
    if (i < 3) await expect(page.getByText(i + 1 + " / 4 cuts")).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: /Halve the key lime/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Disable camera" }).click();
  await expect(page.locator(".handcursor")).toBeHidden();
});
