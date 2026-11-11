import { test, expect, type Page } from "@playwright/test";

async function enterEnd(page: Page, city = "miami") {
  await page.addInitScript((city) => {
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city,
        step: 0,
        progress: 1,
        distance: 3.94,
      }),
    );
  }, city);
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await expect(page.locator(".world canvas")).toBeVisible();
  await page.keyboard.down("ArrowUp");
  await expect(page.locator(".traveler")).toHaveAttribute(
    "data-activity",
    "arriving",
  );
  await page.keyboard.up("ArrowUp");
}

test.describe("arrival choreography", () => {
  test.use({ reducedMotion: "no-preference" });

  for (const city of ["miami", "hawaii", "la"]) {
    test(
      city + " turns and raises its drink before offering the next destination",
      async ({ page }) => {
        if (city === "la")
          await page.setViewportSize({ width: 390, height: 844 });
        await enterEnd(page, city);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator(".arrival-cup")).toHaveAttribute(
          "src",
          "/art/" + city + "/cup.webp",
        );
        await expect(
          page.getByRole("button", { name: "Walk back" }),
        ).toBeDisabled();
        // Direction keys and an existing touch/mouse drag cannot interrupt the toast.
        await page.keyboard.down("ArrowDown");
        const box = (await page.locator(".world").boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + 30);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + 160, { steps: 6 });
        await page.mouse.up();
        await expect
          .poll(() =>
            page
              .locator(".arrival-cheers")
              .evaluate((el) => Number(getComputedStyle(el).opacity)),
          )
          .toBe(1);
        await expect(page.locator(".world")).toHaveAttribute(
          "data-distance",
          "4.000",
        );
        await expect(page.getByRole("dialog")).toHaveCount(0);
        const turn = await page
          .locator(".arrival-front")
          .evaluate((el) => Number(getComputedStyle(el).opacity));
        const lift = await page
          .locator(".arrival-toast")
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).b);
        expect(turn).toBe(1);
        expect(lift).toBeGreaterThan(0.3);
        await page.screenshot({
          path: "output/playwright/arrival-" + city + ".png",
        });
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.up("ArrowDown");
        await page.getByRole("button", { name: "Keep exploring" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator(".arrival")).toHaveCount(0);
        await page.keyboard.down("ArrowDown");
        await expect
          .poll(async () =>
            Number(await page.locator(".world").getAttribute("data-distance")),
          )
          .toBeLessThan(3.9);
        await page.keyboard.up("ArrowDown");
      },
    );
  }

  test("leaving during the celebration cancels the pending menu", async ({
    page,
  }) => {
    await enterEnd(page);
    await page.getByRole("button", { name: "All destinations" }).click();
    await expect(
      page.getByRole("heading", { name: "Choose Your Summer." }),
    ).toBeVisible();
    await page.waitForTimeout(2800);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".arrival")).toHaveCount(0);
  });
});

test("reduced motion presents a still toast, then continues without waiting for animation events", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterEnd(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const animations = await page
    .locator(".arrival")
    .evaluate((el) => el.getAnimations({ subtree: true }).length);
  expect(animations).toBe(0);
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1800 });
});
