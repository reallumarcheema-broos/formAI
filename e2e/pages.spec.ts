import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { resetStripe, subscribe } from "./helpers/auth";

/** Collect console errors and uncaught exceptions for the page's lifetime. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, "page should not scroll sideways").toBeLessThanOrEqual(innerWidth);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

test.beforeEach(async () => {
  await resetStripe();
});

for (const [path, heading] of [
  ["/", /Your AI form coach/],
  ["/pricing", /One plan\. Every exercise\./],
  ["/account", /Account/],
  ["/terms", /Terms of Service/],
  ["/privacy", /Privacy Policy/],
  ["/refunds", /Refund Policy/],
] as const) {
  test(`@ui ${path} renders cleanly for a visitor`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page).toHaveTitle(/FormAI/);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });

  test(`@ui ${path} renders cleanly for a subscriber`, async ({ page, context, baseURL }) => {
    await subscribe(context, baseURL!);
    const errors = trackErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });
}

test("@ui unknown pages show a friendly 404", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page).toHaveURL("/");
});

test("@ui unknown exercise is a 404", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  const res = await page.goto("/workout/burpee");
  expect(res?.status()).toBe(404);
});

test("@ui header navigation works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL("/pricing");
  await page.getByRole("link", { name: "Account" }).click();
  await expect(page).toHaveURL("/account");
  await page.getByRole("link", { name: /FormAI/ }).first().click();
  await expect(page).toHaveURL("/");
});

test("@ui footer links to the legal pages from every page", async ({ page }) => {
  for (const path of ["/", "/pricing", "/account"]) {
    await page.goto(path);
    const legal = page.getByRole("navigation", { name: "Legal" });
    await expect(legal.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    await expect(legal.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    await expect(legal.getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", "/refunds");
  }
  await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Refund Policy" }).click();
  await expect(page).toHaveURL("/refunds");
  await expect(page.getByText(/within 7 days of your first payment/)).toBeVisible();
});

test("@ui legal pages state the real price and on-device privacy", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText("$14.99 USD per month").first()).toBeVisible();
  await expect(page.getByText(/renews automatically every month/)).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByText(/never recorded, stored or sent/)).toBeVisible();
  await expect(page.getByText("formai_pro")).toBeVisible();
});

test("@ui security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["permissions-policy"]).toContain("camera=(self)");
});

test("MediaPipe WASM is served from our own origin", async ({ request }) => {
  const res = await request.get("/mediapipe/wasm/vision_wasm_internal.wasm");
  expect(res.status()).toBe(200);
  expect((await res.body()).length).toBeGreaterThan(1_000_000);
});
