import { test, expect, type Page } from "@playwright/test";
async function checkpoint(page: Page, scene: string, step: number, stop = 0) {
  await page.goto("/art/routes.json");
  await page.evaluate(
    ({ scene, step, stop }) =>
      sessionStorage.setItem(
        "heytea-summer-v1",
        JSON.stringify({
          scene,
          step,
          city: "miami",
          stop,
          discovered: false,
          progress: 0,
        }),
      ),
    { scene, step, stop },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Continue Without Camera" }).click();
}
test("pointer cutting, paused pouring, circular stirring and travel via keyboard", async ({
  page,
}) => {
  await checkpoint(page, "station", 0);
  let r = (await page.locator(".station-pad").boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.27, r.y + r.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.8, r.y + r.height * 0.45, {
    steps: 16,
  });
  await expect(page.getByText("1 / 4 cuts")).toBeVisible();
  for (const x of [0.27, 0.8, 0.27])
    await page.mouse.move(r.x + r.width * x, r.y + r.height * 0.45, {
      steps: 8,
    });
  await page.mouse.up();
  await expect(page.getByText("Step complete")).toBeVisible();
  await checkpoint(page, "station", 5);
  r = (await page.locator(".station-pad").boundingBox())!;
  await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(420);
  await page.mouse.up();
  const partial = await page.locator(".progress-label").textContent();
  expect(partial).toMatch(/^[1-9][0-9]?% complete$/);
  await page.waitForTimeout(200);
  await expect(page.locator(".progress-label")).toHaveText(partial!);
  await checkpoint(page, "station", 6);
  r = (await page.locator(".station-pad").boundingBox())!;
  const move = (angle: number) =>
    page.mouse.move(
      r.x + r.width * (0.5 + 0.23 * Math.cos(angle)),
      r.y + r.height * (0.51 + 0.23 * Math.sin(angle)),
    );
  await move(0);
  await page.mouse.down();
  for (let i = 1; i <= 124; i++) {
    await move((i * Math.PI) / 30);
    if (i === 62) await expect(page.getByText("1 / 2 turns")).toBeVisible();
  }
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "You Made It!" }),
  ).toBeVisible();
  await checkpoint(page, "explore", 6);
  await expect(page.locator(".world canvas")).toBeVisible();
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowUp");
  expect(
    Number(await page.locator(".world").getAttribute("data-distance")),
  ).toBeGreaterThan(0.05);
});
test("touch drag peels pineapple and mobile route fits", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(process.env.PW_BASE_URL || "http://127.0.0.1:5173");
  await page.getByText("Continue Without Camera").tap();
  await page.getByText("Step Into Summer").tap();
  await page.getByRole("button", { name: "Hawaii Golden Aloha" }).tap();
  await page.getByText("Make this drink").tap();
  const r = (await page.locator(".station-pad").boundingBox())!,
    cdp = await ctx.newCDPSession(page);
  const x = r.x + r.width * 0.5;
  for (let i = 0; i < 3; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: r.y + r.height * 0.24 }],
    });
    for (let i = 0; i < 12; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: r.y + r.height * (0.24 + i * 0.045) }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await expect(page.getByText("Step complete")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "output/playwright/phone-prepared.png" });
  await ctx.close();
});

test("traveler actions from buttons and number keys, with a selfie postcard", async ({
  page,
}) => {
  await checkpoint(page, "explore", 6);
  await expect(page.locator(".world canvas")).toBeVisible();
  const traveler = page.locator(".traveler");
  for (const [label, activity] of [
    ["Sit", "sit"],
    ["Sip", "sip"],
    ["Wave", "wave"],
  ] as const) {
    await page.getByRole("button", { name: label, exact: false }).click();
    await expect(traveler).toHaveAttribute("data-activity", activity);
    await expect(
      page.getByRole("button", { name: label, exact: false }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.keyboard.press("4");
  await expect(traveler).toHaveAttribute("data-activity", "selfie");
  const card = page.locator(".selfie-postcard");
  await expect(card.locator("img")).toBeVisible();
  expect(await card.locator("img").getAttribute("src")).toMatch(
    /^data:image\/jpeg;base64,/,
  );
  await expect(
    card.getByRole("link", { name: "Save postcard" }),
  ).toHaveAttribute("download", "heytea-miami-selfie.jpg");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowUp");
  await expect(traveler).not.toHaveAttribute("data-activity", "selfie");
  await card.getByRole("button", { name: "Close postcard" }).click();
  await expect(card).toBeHidden();
});
