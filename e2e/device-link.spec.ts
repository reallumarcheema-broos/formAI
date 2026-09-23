import { expect, test } from "@playwright/test";
import { resetStripe, signToken, subscribe } from "./helpers/auth";

test.beforeEach(async () => {
  await resetStripe();
});

test("@ui a subscriber can unlock a second device with the QR link", async ({ page, context, baseURL, browser }) => {
  await subscribe(context, baseURL!);
  await page.goto("/account");
  await page.getByRole("link", { name: "Show QR code" }).click();
  await expect(page.getByRole("img", { name: "QR code to link another device" }).locator("svg")).toBeVisible();
  const link = await page.getByTestId("device-link").inputValue();
  expect(link).toMatch(/\/api\/device-link\?t=/);

  // A brand-new device (fresh browser context, no cookies) opens the link.
  const phone = await browser.newContext();
  const phonePage = await phone.newPage();
  await phonePage.goto(link);
  await expect(phonePage).toHaveURL("/?welcome=device");
  await expect(phonePage.getByRole("status")).toContainText("This device is now linked");
  await phonePage.goto("/workout/lunge");
  await expect(phonePage).toHaveURL("/workout/lunge");
  await phone.close();
});

test("tampered, expired or reused-as-cookie links are rejected", async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  const expired = signToken({ kind: "link", customerId: "cus_seed", subscriptionId: "sub_seed_active", exp: now - 1 });
  const forged = signToken({ kind: "link", customerId: "cus_seed", subscriptionId: "sub_seed_active", exp: now + 600 }, "nope");
  const cookieAsLink = signToken({ kind: "pro", customerId: "cus_seed", subscriptionId: "sub_seed_active", iat: now });

  for (const t of [expired, forged, cookieAsLink, "junk"]) {
    await page.goto(`/api/device-link?t=${encodeURIComponent(t)}`);
    await expect(page).toHaveURL("/pricing?error=link-invalid");
  }
  await page.goto("/workout/squat");
  await expect(page).toHaveURL("/pricing?exercise=squat");
});

test("a link for a canceled subscription is rejected", async ({ page }) => {
  const t = signToken({
    kind: "link",
    customerId: "cus_seed2",
    subscriptionId: "sub_seed_canceled",
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  await page.goto(`/api/device-link?t=${t}`);
  await expect(page).toHaveURL("/pricing?error=link-inactive");
});

test("visitors don't see the device-link section", async ({ page }) => {
  await page.goto("/account?link=1");
  await expect(page.getByRole("heading", { name: "Use on another device" })).toHaveCount(0);
  await expect(page.getByTestId("device-link")).toHaveCount(0);
});
