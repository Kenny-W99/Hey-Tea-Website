import { test, expect } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test("phone selection keeps all recipe choices below the hero cup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Continue Without Camera").tap();
  await page.getByText("Step Into Summer").tap();
  await page.getByRole("button", { name: "Hawaii Golden Aloha" }).tap();
  const cup = page.locator(".phone-hero-cup img");
  await cup.evaluate((el) => (el as HTMLImageElement).decode());
  const image = (await cup.boundingBox())!,
    controls = (await page.locator(".counter").boundingBox())!;
  expect(image.y + image.height).toBeLessThanOrEqual(controls.y);
  await page.screenshot({ path: "output/playwright/phone-selection.png" });
});
test("mobile route follows the rear traveler into the scene on a touch drag", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city: "hawaii",
        step: 6,
        stop: 2,
        progress: 1,
        discovered: false,
      }),
    ),
  );
  await page.goto("/");
  await page.getByText("Continue Without Camera").tap();
  await expect(page.locator(".world canvas")).toBeVisible();
  const actor = page.getByRole("img", { name: /Following the traveler/ });
  const start = (await actor.boundingBox())!;
  const area = (await page.locator(".world").boundingBox())!,
    cdp = await page.context().newCDPSession(page);
  const x = area.x + area.width * 0.5;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: area.y + area.height * 0.75 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: area.y + area.height * 0.5 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () =>
      Number(await page.locator(".world").getAttribute("data-distance")),
    )
    .toBeGreaterThan(2.14);
  const after = (await actor.boundingBox())!;
  expect(Math.abs(after.x - start.x)).toBeLessThan(1);
  await page.screenshot({ path: "output/playwright/phone-route.png" });
});
