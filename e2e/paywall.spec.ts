import { expect, test } from "@playwright/test";
import { MOCK_STRIPE, proCookie, resetStripe, signToken, stripeState } from "./helpers/auth";

const EXERCISES = ["squat", "pushup", "lunge"];

test.beforeEach(async () => {
  await resetStripe();
});

test("@ui visitors see $14.99/month and every exercise locked", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Get FormAI Pro: \$14\.99\/month/ })).toBeVisible();
  for (const id of EXERCISES) {
    const card = page.getByTestId(`exercise-${id}`);
    await expect(card).toContainText("Unlock");
    await expect(card).toHaveAttribute("href", `/pricing?exercise=${id}`);
  }
  await page.goto("/pricing");
  await expect(page.getByTestId("price")).toHaveText("$14.99 / month (USD)");
  await expect(page.getByRole("button", { name: "Subscribe for $14.99/month" })).toBeVisible();
  // Auto-renewal is disclosed right next to the button, with links to the policies.
  const terms = page.getByTestId("renewal-terms");
  await expect(terms).toContainText("Renews automatically at $14.99/month until you cancel");
  await expect(terms.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(terms.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await expect(terms.getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", "/refunds");
});

test("@ui every workout redirects visitors to pricing", async ({ page }) => {
  for (const id of EXERCISES) {
    await page.goto(`/workout/${id}`);
    await expect(page).toHaveURL(`/pricing?exercise=${id}`);
    await expect(page.getByText(/Subscribe to start your .* workout/)).toBeVisible();
  }
});

test("checkout charges $14.99 USD per month in subscription mode", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await expect(page).toHaveURL(new RegExp(`^${MOCK_STRIPE}/pay/`));
  await expect(page.getByTestId("amount")).toHaveText("USD 14.99 / month");

  const [session] = (await stripeState()).sessions;
  expect(session.params.mode).toBe("subscription");
  expect(session.params["line_items[0][price_data][unit_amount]"]).toBe("1499");
  expect(session.params["line_items[0][price_data][currency]"]).toBe("usd");
  expect(session.params["line_items[0][price_data][recurring][interval]"]).toBe("month");
  expect(session.params["line_items[0][quantity]"]).toBe("1");
});

test("canceling checkout returns to pricing without unlocking", async ({ page }) => {
  await page.goto("/pricing?exercise=lunge");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL("/pricing?canceled=1&exercise=lunge");
  await expect(page.getByText("Checkout canceled")).toBeVisible();
  await page.goto("/workout/lunge");
  await expect(page).toHaveURL("/pricing?exercise=lunge");
});

test("an unpaid (open) checkout session cannot be confirmed", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  const [session] = (await stripeState()).sessions;
  await page.goto(`/api/checkout/confirm?session_id=${session.id}`);
  await expect(page).toHaveURL("/pricing?error=incomplete");
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "formai_pro")).toBeUndefined();
});

test("a made-up checkout session id is rejected", async ({ page }) => {
  await page.goto("/api/checkout/confirm?session_id=cs_fake_123");
  await expect(page).toHaveURL("/pricing?error=checkout");
  await page.goto("/api/checkout/confirm");
  await expect(page).toHaveURL("/pricing");
});

test("forged or tampered cookies do not unlock workouts", async ({ page, context, baseURL }) => {
  const forgedSecret = signToken({ kind: "pro", customerId: "cus_x", subscriptionId: "sub_seed_active", iat: 1 }, "wrong-secret");
  const valid = proCookie("sub_seed_active");
  const [body, sig] = valid.split(".");
  const tamperedBody = Buffer.from(
    JSON.stringify({ kind: "pro", customerId: "cus_x", subscriptionId: "sub_other", iat: 1 }),
  ).toString("base64url");
  const linkAsCookie = signToken({ kind: "link", customerId: "cus_seed", subscriptionId: "sub_seed_active", exp: 9e9 });

  for (const value of [forgedSecret, `${tamperedBody}.${sig}`, `${body}.${sig}x`, "garbage", linkAsCookie]) {
    await context.clearCookies();
    await context.addCookies([{ name: "formai_pro", value, url: baseURL! }]);
    await page.goto("/workout/squat");
    await expect(page, `cookie ${value.slice(0, 20)}… must not unlock`).toHaveURL("/pricing?exercise=squat");
  }
});

test("a canceled subscription does not unlock workouts", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "formai_pro", value: proCookie("sub_seed_canceled"), url: baseURL! }]);
  await page.goto("/workout/pushup");
  await expect(page).toHaveURL("/pricing?exercise=pushup");
  await page.goto("/account");
  await expect(page.getByTestId("plan-name")).toHaveText("No active plan");
  await expect(page.getByText("Status: canceled")).toBeVisible();
});

test("a subscription unknown to Stripe does not unlock workouts", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "formai_pro", value: proCookie("sub_does_not_exist"), url: baseURL! }]);
  await page.goto("/workout/squat");
  await expect(page).toHaveURL("/pricing?exercise=squat");
});

test("billing portal requires a subscription cookie", async ({ request }) => {
  const res = await request.post("/api/billing-portal", { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toMatch(/\/pricing$/);
});

test("checkout ignores unknown exercise ids (no open redirect)", async ({ page }) => {
  await page.goto("/pricing?exercise=https://evil.example");
  await page.getByRole("button", { name: /Subscribe/ }).click();
  const [session] = (await stripeState()).sessions;
  expect(session.params.success_url).not.toContain("evil");
  await page.getByRole("button", { name: "Pay and subscribe" }).click();
  await expect(page).toHaveURL("/?welcome=1");
});
