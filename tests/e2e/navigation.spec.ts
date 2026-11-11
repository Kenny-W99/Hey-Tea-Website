import { test, expect } from "@playwright/test";
test("back and refresh restore the drink and keep entry choice explicit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue Without Camera" }).click();
  await page.getByText("Step Into Summer").click();
  await page.getByText("Make this drink").click();
  await page.getByText("Cut a section").click();
  await expect(page.getByText("1 / 4 cuts")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByText("Continue Without Camera").click();
  await expect(page.getByText("1 / 4 cuts")).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Make this drink" }),
  ).toBeVisible();
});
test("missing scene texture retains forward movement and arrival", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "heytea-summer-v1",
      JSON.stringify({
        scene: "explore",
        city: "la",
        step: 5,
        stop: 2,
        progress: 1,
        discovered: false,
      }),
    ),
  );
  await page.route("**/art/la/2-scene.webp", (r) => r.abort());
  await page.goto("/");
  await page.getByText("Continue Without Camera").click();
  await expect(page.locator(".travel-backup")).toBeVisible();
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowUp");
  expect(
    Number(await page.locator(".world").getAttribute("data-distance")),
  ).toBeGreaterThan(2);
});
