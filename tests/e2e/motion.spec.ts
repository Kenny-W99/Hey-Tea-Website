import { test, expect } from "@playwright/test";
test.use({ reducedMotion: "no-preference" });
test("animates the arch approach and settles on the cup counter", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await page.locator(".globe-photo").evaluate(async (el) => {
    await (el as HTMLImageElement).decode();
  });
  await page.screenshot({ path: "output/playwright/globe.png" });
  await page.getByText("Step Into Summer").click();
  await expect
    .poll(() =>
      page
        .locator(".globe-photo")
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a),
    )
    .toBeGreaterThan(1.005);
  await page.screenshot({ path: "output/playwright/globe-entering.png" });
  await expect(
    page.getByRole("button", { name: /Make this drink/ }),
  ).toBeVisible();
});
test("keeps one camera and traveler through a landmark in both directions", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city: "hawaii",
        step: 6,
        progress: 1,
        distance: 0.78,
      }),
    ),
  );
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  const world = page.locator(".world");
  await expect(world.locator("canvas")).toBeVisible();
  const canvas = await world.locator("canvas").elementHandle(),
    traveler = await page.locator(".traveler").elementHandle();
  await page.keyboard.down("ArrowUp");
  await expect(
    page.getByRole("heading", { name: "Kilauea Point Lighthouse" }),
  ).toBeVisible();
  await page.waitForTimeout(1300);
  await page.keyboard.up("ArrowUp");
  await page.keyboard.down("ArrowDown");
  await expect(
    page.getByRole("heading", { name: "Byodo-In Temple" }),
  ).toBeVisible();
  await page.keyboard.up("ArrowDown");
  expect(await canvas!.evaluate((el) => el.isConnected)).toBe(true);
  expect(await traveler!.evaluate((el) => el.isConnected)).toBe(true);
});

test("pausing in the city reveals its mascot action and walking interrupts it", async ({
  page,
}) => {
  for (const [city, distance, activity] of [
    ["miami", 1.2, "sit"],
    ["la", 0.2, "wave"],
    ["la", 1.2, "skate"],
  ] as const) {
    await page.goto("/art/routes.json");
    await page.evaluate(
      ({ city, distance }) => {
        sessionStorage.setItem(
          "heytea-summer-v1",
          JSON.stringify({
            scene: "explore",
            city,
            step: 0,
            progress: 1,
            distance,
          }),
        );
      },
      { city, distance },
    );
    await page.goto("/");
    await page.getByText("Continue Without Camera").click();
    await expect(page.locator(".traveler")).toHaveAttribute(
      "data-activity",
      activity,
    );
    const position = async () =>
      Number(await page.locator(".world").getAttribute("data-distance"));
    expect(await position()).toBeCloseTo(distance, 2);
    await page.keyboard.down("ArrowDown");
    await expect(page.locator(".traveler")).toHaveAttribute(
      "data-activity",
      "walking",
    );
    await expect.poll(position).toBeLessThan(distance - 0.016);
    await page.keyboard.up("ArrowDown");
    await expect(page.locator(".traveler")).toHaveAttribute(
      "data-activity",
      activity,
    );
  }
});
