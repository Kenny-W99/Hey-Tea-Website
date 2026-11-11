import { test, expect, type Page } from "@playwright/test";
import { recipes, type City } from "../../src/game/catalog";
import { mkdir } from "node:fs/promises";
const shots = "output/playwright";
async function capture(page: Page, file: string) {
  await mkdir(shots, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((i) => i.decode().catch(() => {})),
    );
  });
  const stage = page.locator(".station-render");
  if (await stage.count()) {
    await expect(stage.locator("canvas")).toBeVisible();
    await page.waitForTimeout(320);
  }
  await page.screenshot({
    path: shots + "/" + file + ".png",
    animations: "disabled",
  });
  if (!file.startsWith("entry-"))
    await expect(page).toHaveScreenshot(file + ".png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.015,
    });
}
for (const city of Object.keys(recipes) as City[]) {
  test("make, reveal, explore and replay " + city, async ({ page }) => {
    test.setTimeout(120000);
    const recipe = recipes[city];
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(r.url() + " " + r.status());
    });
    await page.goto("/");
    await page.getByText("Continue Without Camera").click();
    await page.getByText("Step Into Summer").click();
    const select = page.getByRole("button", {
      name: recipe.place + " " + recipe.name,
    });
    await select.click();
    await expect(select).toHaveAttribute("aria-pressed", "true");
    if (city === "miami") await capture(page, "selection");
    await page.getByText("Make this drink").click();
    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      await expect(
        page.getByRole("heading", { name: step.title + "." }),
      ).toBeVisible();
      const action = page.getByRole("button", {
        name: step.button,
        exact: true,
      });
      await action.click();
      if (
        city === "miami" &&
        (i === 0 || ["pour", "stir", "mash"].includes(step.mode))
      )
        await capture(page, "station-" + step.mode);
      let n = 0;
      while ((await action.count()) && n++ < 9) await action.click();
      await expect(page.getByText("Step complete")).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: "You Made It!" }),
    ).toBeVisible();
    if (city === "hawaii") await capture(page, "reveal");
    await page.getByRole("button", { name: /Explore Your Summer/ }).click();
    if (city === "miami") await capture(page, "explore-intro");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const world = page.locator(".world");
    await expect(world.locator("canvas")).toBeVisible();
    const box = (await world.boundingBox())!;
    for (let i = 0; i < 4; i++) {
      await expect(
        page.getByRole("heading", { name: recipe.stops[i].name }),
      ).toBeVisible();
      if (i === 1) {
        const activity = { miami: "sit", hawaii: "toast", la: "skate" }[city];
        await expect(page.locator(".traveler")).toHaveAttribute(
          "data-activity",
          activity,
        );
        await capture(page, "city-" + city);
      }
      for (let n = 0; n < 3; n++) {
        await page.mouse.move(
          box.x + box.width * 0.5,
          box.y + box.height * 0.85,
        );
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width * 0.5,
          box.y + box.height * 0.38,
          { steps: 14 },
        );
        await page.mouse.up();
      }
      await expect
        .poll(async () => Number(await world.getAttribute("data-distance")))
        .toBeGreaterThan(i + 0.99);
    }
    await page.getByRole("button", { name: /Finish your summer/ }).click();
    await expect(
      page.getByRole("heading", { name: "Your Summer Is Ready." }),
    ).toBeVisible();
    if (city === "la") await capture(page, "final");
    await page.getByText("Choose Another Summer").click();
    await expect(page.getByText("Make this drink")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["laptop", 1280, 720],
  ["tablet", 768, 1024],
  ["phone", 390, 844],
  ["narrow", 320, 700],
] as const) {
  test("entry composition at " + name, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Enable Camera" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Continue Without Camera" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await capture(page, "entry-" + name);
    await expect(page).toHaveScreenshot("onboarding-" + name + ".png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
}
