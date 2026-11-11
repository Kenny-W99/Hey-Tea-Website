import { test, expect } from "@playwright/test";

test("exits mid-route and can make a different destination's drink", async ({
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
        distance: 1.4,
      }),
    ),
  );
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await page.getByRole("button", { name: "All destinations" }).click();
  await page.getByRole("button", { name: "Hawaii Golden Aloha" }).click();
  await page.getByRole("button", { name: /Make this drink/ }).click();
  await expect(
    page.getByRole("heading", { name: "Peel the pineapple." }),
  ).toBeVisible();
});

test("shows a reachable exit at the end, resumes backtracking, and chooses another city", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city: "la",
        step: 0,
        progress: 1,
        distance: 3.94,
      }),
    ),
  );
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await page.keyboard.down("ArrowUp");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.up("ArrowUp");
  await expect(
    page.getByRole("button", { name: /Choose another city/ }),
  ).toBeInViewport();
  await page.screenshot({ path: "output/playwright/route-end-phone.png" });
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.down("ArrowDown");
  await expect
    .poll(async () =>
      Number(await page.locator(".world").getAttribute("data-distance")),
    )
    .toBeLessThan(3.9);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("ArrowUp");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: /Choose another city/ }).click();
  await expect(
    page.getByRole("heading", { name: "Choose Your Summer." }),
  ).toBeVisible();
});
