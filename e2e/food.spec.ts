import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { resetStripe, subscribe } from "./helpers/auth";
import { MOCK_AI } from "./helpers/constants";
import { fixturePath } from "./helpers/fixtures";

async function nextScenario(scenario: "food" | "not_food" | "refusal" | "error") {
  await fetch(`${MOCK_AI}/__test/next`, { method: "POST", body: new URLSearchParams({ scenario }) });
}
async function lastAiRequest() {
  return (await fetch(`${MOCK_AI}/__test/last`)).json();
}

async function scan(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer } = fixturePath("burger")) {
  await page.getByTestId("upload-input").setInputFiles(file);
}

test.beforeEach(async () => {
  await resetStripe();
  await nextScenario("food");
});

test("@ui visitors are sent to pricing, and the API refuses them", async ({ page, request }) => {
  await page.goto("/food");
  await expect(page).toHaveURL("/pricing?exercise=food");
  await expect(page.getByText(/Subscribe to use the/)).toContainText("AI food photo scanner");
  const res = await request.post("/api/food/analyze", { data: { image: "aGVsbG8=", mediaType: "image/jpeg" } });
  expect(res.status()).toBe(402);
});

test("@ui scan a meal, adjust portions and log it", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  await page.goto("/food");
  await expect(page.getByRole("heading", { name: "Snap your meal" })).toBeVisible();
  await expect(page.getByText(/sent securely to our AI provider \(Anthropic\)/)).toBeVisible();

  await scan(page);
  const result = page.getByTestId("food-result");
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("food-item")).toHaveCount(2);
  await expect(page.getByTestId("meal-kcal")).toContainText("860");
  await expect(result).toContainText("rough estimate"); // low-confidence item is marked
  await expect(result).toContainText("Oil in the fries is hard to judge");

  // Double the fries, then remove the burger.
  await page.getByRole("group", { name: "Portion of French fries" }).getByRole("button", { name: "×2" }).click();
  await expect(page.getByTestId("meal-kcal")).toContainText("1180");
  await page.getByRole("button", { name: "Remove Cheeseburger" }).click();
  await expect(page.getByTestId("meal-kcal")).toContainText("640");

  await page.getByRole("button", { name: "Add to food log" }).click();
  await expect(page.getByRole("status")).toContainText("640 kcal added");
  await expect(page.getByTestId("eaten-today")).toContainText("640 kcal");
  await expect(page.getByTestId("food-log")).toContainText("French fries");

  // The server called Claude correctly.
  const ai = await lastAiRequest();
  expect(ai.body.model).toBe("claude-opus-5");
  expect(ai.body.fallbacks).toBe("default");
  expect(ai.headers.beta).toContain("server-side-fallback-2026-07-01");
  expect(ai.body.output_config.format.type).toBe("json_schema");
  expect(ai.image.media_type).toBe("image/jpeg");

  // It persists, and shows up as calories in on the Progress page.
  await page.reload();
  await expect(page.getByTestId("eaten-today")).toContainText("640 kcal");
  await page.goto("/progress");
  await expect(page.getByTestId("progress-eaten")).toContainText("640");
  await expect(page.getByTestId("progress-net")).toContainText("640");

  // Deleting an entry updates the total.
  await page.goto("/food");
  await page.getByRole("button", { name: /Delete French fries/ }).click();
  await expect(page.getByTestId("eaten-today")).toContainText("0 kcal");
});

test("large photos are downsized to 1024px before upload", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  await page.goto("/food");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 2400;
    c.height = 1600;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#c7822f";
    ctx.fillRect(0, 0, 2400, 1600);
    return c.toDataURL("image/png").split(",")[1];
  });
  await scan(page, { name: "big.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.getByTestId("food-result")).toBeVisible({ timeout: 15_000 });
  const ai = await lastAiRequest();
  expect(ai.image.width).toBe(1024);
  expect(ai.image.height).toBe(683);
});

test("non-food photos, refusals and errors show helpful messages", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  await page.goto("/food");

  await nextScenario("not_food");
  await scan(page);
  const alert = page.locator("p[role=alert]");
  await expect(alert).toContainText("couldn't find food");

  await nextScenario("refusal");
  await scan(page);
  await expect(alert).toContainText("couldn't analyse that photo");

  await nextScenario("error");
  await scan(page);
  await expect(alert).toContainText("Something went wrong");

  // Recovers on the next try.
  await scan(page);
  await expect(page.getByTestId("food-result")).toBeVisible({ timeout: 15_000 });
});

test("the API rejects malformed images", async ({ context, baseURL, page }) => {
  await subscribe(context, baseURL!);
  const bad = [
    { image: "", mediaType: "image/jpeg" },
    { image: "not base64!!", mediaType: "image/jpeg" },
    { image: "aGVsbG8=", mediaType: "image/gif" },
    { image: "A".repeat(4_000_001), mediaType: "image/jpeg" },
  ];
  for (const data of bad) {
    const res = await page.request.post("/api/food/analyze", { data });
    expect(res.status(), JSON.stringify(data).slice(0, 60)).toBe(400);
  }
});

test("@ui food can be added manually, and the page is accessible", async ({ page, context, baseURL }) => {
  await subscribe(context, baseURL!);
  await page.goto("/food");
  await page.getByRole("button", { name: "+ Add food manually" }).click();
  await page.getByLabel("Food").fill("2 rotis");
  await page.getByLabel("Calories").fill("0");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText(/Enter a food name and calories/)).toBeVisible();
  await page.getByLabel("Calories").fill("240");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByTestId("food-log")).toContainText("2 rotis");
  await expect(page.getByTestId("eaten-today")).toContainText("240 kcal");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
