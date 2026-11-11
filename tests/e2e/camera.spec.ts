import { test, expect } from "@playwright/test";
test("waits for a decision even on refresh and skips without requesting video", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => {
      throw new Error("unexpected camera request");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Step Into Summer")).toHaveCount(0);
  await page.getByText("Continue Without Camera").click();
  await expect(page.getByText("Step Into Summer")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
});
for (const name of ["NotFoundError", "NotAllowedError"]) {
  test(name + " offers recovery and retry", async ({ page }) => {
    await page.addInitScript((name) => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("test device", name);
      };
    }, name);
    await page.goto("/");
    await page.getByRole("button", { name: "Enable Camera" }).click();
    await expect(
      page.getByText(
        name === "NotFoundError" ? /couldn’t find a camera/ : /site settings/,
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try Again", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Try Again", exact: true }),
    ).toBeEnabled();
    await page.getByText("Continue Without Camera").click();
    await expect(page.getByText("Step Into Summer")).toBeVisible();
  });
}
test("a pending permission can be skipped", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => new Promise(() => {});
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enable Camera" }).click();
  await expect(page.getByText("Connecting…")).toBeVisible();
  await page.screenshot({ path: "output/playwright/entry-pending.png" });
  await page.getByText("Continue Without Camera").click();
  await expect(page.getByText("Camera off")).toBeVisible();
});
test("branded recovery has reachable controls at narrow size and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("unavailable", "NotAllowedError");
    };
  });
  await page.goto("/");
  await expect(page.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Enable Camera" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/site settings/)).toBeVisible();
  await page.screenshot({
    path: "output/playwright/entry-denied.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue Without Camera" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Step Into Summer")).toBeVisible();
});
