import { expect, test } from "@playwright/test";
import { MOCK_STRIPE, resetStripe, stripeState } from "./helpers/auth";

test.beforeEach(async () => {
  await resetStripe();
});

test("@ui buy the subscription, then go straight into the workout", async ({ page, context }) => {
  // A visitor picks Push-ups on the home page…
  await page.goto("/");
  await page.getByTestId("exercise-pushup").click();
  await expect(page).toHaveURL("/pricing?exercise=pushup");

  // …subscribes for $14.99/month on (mock) Stripe…
  await page.getByRole("button", { name: "Subscribe for $14.99/month" }).click();
  await expect(page).toHaveURL(new RegExp(`^${MOCK_STRIPE}/pay/`));
  await page.getByRole("button", { name: "Pay and subscribe" }).click();

  // …and lands directly in the push-up workout.
  await expect(page).toHaveURL("/workout/pushup");
  await expect(page.getByText("Push-up", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to exercises" })).toBeVisible();

  const cookie = (await context.cookies()).find((c) => c.name === "formai_pro");
  expect(cookie, "subscription cookie is set").toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe("Lax");

  // Every exercise is now unlocked.
  await page.goto("/");
  await expect(page.getByText("PRO", { exact: true })).toBeVisible();
  for (const id of ["squat", "pushup", "lunge"]) {
    await expect(page.getByTestId(`exercise-${id}`)).toContainText("Start");
    await expect(page.getByTestId(`exercise-${id}`)).toHaveAttribute("href", `/workout/${id}`);
  }

  // Account shows the active plan.
  await page.goto("/account");
  await expect(page.getByTestId("plan-name")).toHaveText("FormAI Pro");
  await expect(page.getByText("Status: active")).toBeVisible();
  await expect(page.getByText("$14.99 / month")).toBeVisible();
});

test("subscribing from the pricing page lands on the home page with a welcome", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await page.getByRole("button", { name: "Pay and subscribe" }).click();
  await expect(page).toHaveURL("/?welcome=1");
  await expect(page.getByRole("status")).toContainText("You're subscribed!");
  await page.getByTestId("exercise-squat").click();
  await expect(page).toHaveURL("/workout/squat");
});

test("subscribers can't be charged twice", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await page.getByRole("button", { name: "Pay and subscribe" }).click();

  await page.goto("/pricing");
  await expect(page.getByRole("button", { name: /Subscribe/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /start a workout/ })).toBeVisible();

  // Even a direct POST won't start a second checkout.
  const res = await page.request.post("/api/checkout", { maxRedirects: 0 });
  expect(res.headers().location).toMatch(/\/account$/);
  expect((await stripeState()).sessions).toHaveLength(1);
});

test("canceling in the billing portal removes access", async ({ page }) => {
  await page.goto("/pricing?exercise=squat");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await page.getByRole("button", { name: "Pay and subscribe" }).click();
  await expect(page).toHaveURL("/workout/squat");

  await page.goto("/account");
  await page.getByRole("button", { name: "Manage billing" }).click();
  await expect(page).toHaveURL(new RegExp(`^${MOCK_STRIPE}/portal/`));
  await page.getByRole("button", { name: "Cancel subscription" }).click();

  await expect(page).toHaveURL("/account?refresh=1");
  await expect(page.getByTestId("plan-name")).toHaveText("No active plan");
  await page.goto("/workout/squat");
  await expect(page).toHaveURL("/pricing?exercise=squat");
});

test("a past-due subscription keeps access during Stripe's retry window", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await page.getByRole("button", { name: "Pay and subscribe" }).click();
  const sub = (await stripeState()).subscriptions.find((s) => s.id.startsWith("sub_test"))!;
  await fetch(`${MOCK_STRIPE}/__test/subscriptions/${sub.id}`, { method: "POST", body: new URLSearchParams({ status: "past_due" }) });

  await page.goto("/account?refresh=1");
  await expect(page.getByText("Status: past due")).toBeVisible();
  await page.goto("/workout/lunge");
  await expect(page).toHaveURL("/workout/lunge");
});
