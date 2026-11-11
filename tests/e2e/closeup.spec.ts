import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "no-preference" });
test("walks toward the tower entrance before changing landmarks and can back away", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city: "miami",
        step: 0,
        progress: 1,
        distance: 0,
      }),
    ),
  );
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const canvas = page.locator(".world canvas");
  await expect(canvas).toBeVisible();
  const originalCanvas = await canvas.elementHandle();
  await page.screenshot({ path: "output/playwright/tower-approach-start.png" });
  await page.keyboard.down("ArrowUp");
  const position = async () =>
    Number(await page.locator(".world").getAttribute("data-distance"));
  await expect
    .poll(position, { timeout: 10000, intervals: [50] })
    .toBeGreaterThan(0.81);
  await page.keyboard.up("ArrowUp");
  await expect(
    page.getByRole("heading", { name: "Tower promenade" }),
  ).toBeVisible();
  expect(await position()).toBeLessThan(0.86);
  const closeScale = await page
    .locator(".route-plate")
    .first()
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(closeScale).toBeGreaterThan(1.6);
  // The traveler stays on the walkway in the close view.
  const lane = await page
    .locator(".world")
    .evaluate((el) =>
      parseFloat(getComputedStyle(el).getPropertyValue("--lane")),
    );
  expect(lane).toBeGreaterThan(40);
  expect(lane).toBeLessThan(65);
  await page.screenshot({ path: "output/playwright/tower-approach-close.png" });
  await page.keyboard.down("ArrowDown");
  await expect.poll(position).toBeLessThan(0.65);
  await page.keyboard.up("ArrowDown");
  const backScale = await page
    .locator(".route-plate")
    .first()
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(backScale).toBeLessThan(closeScale - 0.15);
  expect(await originalCanvas!.evaluate((el) => el.isConnected)).toBe(true);
  await expect(
    page.getByRole("button", { name: "All destinations" }),
  ).toBeVisible();
});
