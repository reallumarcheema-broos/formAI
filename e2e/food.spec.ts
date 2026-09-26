import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { resetStripe, subscribe } from "./helpers/auth";

test.beforeEach(async () => {
  await resetStripe();
});

test("@ui visitors are sent to pricing", async ({ page }) => {
  await page.goto("/food");
  await expect(page).toHaveURL("/pricing?exercise=food");
  await expect(page.getByText(/Subscribe to use the/)).toContainText("food log");
});

test("@ui log meals, see the daily total and calories in vs. out", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  await page.goto("/food");
  await expect(page.getByRole("heading", { name: "What did you eat?" })).toBeVisible();
  await expect(page.getByText("Nothing logged yet today.")).toBeVisible();

  // Validation.
  await page.getByLabel("Food", { exact: true }).fill("2 rotis");
  await page.getByLabel("Calories").fill("0");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(/Enter a food name and calories/)).toBeVisible();

  // Manual entry.
  await page.getByLabel("Calories").fill("240");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("240 kcal added");

  // Quick pick fills the form; it can be edited before adding.
  await page.getByRole("button", { name: "1 plate biryani · 650" }).click();
  await expect(page.getByLabel("Food", { exact: true })).toHaveValue("1 plate biryani");
  await page.getByLabel("Calories").fill("700");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByTestId("food-log").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("eaten-today")).toContainText("940 kcal");

  // Persists across reloads and shows on Progress.
  await page.reload();
  await expect(page.getByTestId("eaten-today")).toContainText("940 kcal");
  await page.goto("/progress");
  await expect(page.getByTestId("progress-eaten")).toContainText("940");
  await expect(page.getByTestId("progress-net")).toContainText("940");
  await expect(page.getByRole("link", { name: /Log food/ })).toHaveAttribute("href", "/food");

  // Deleting updates the total.
  await page.goto("/food");
  await page.getByRole("button", { name: "Delete 2 rotis" }).click();
  await expect(page.getByTestId("eaten-today")).toContainText("700 kcal");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("there is no food-scanning API any more", async ({ request }) => {
  const res = await request.post("/api/food/analyze", { data: {} });
  expect(res.status()).toBe(404);
});
