import { expect, test, type Page } from "@playwright/test";
import { resetStripe, subscribe } from "./helpers/auth";
import { installFakeCamera, setScene, spoken } from "./helpers/camera";
import { hasFixtures } from "./helpers/fixtures";

/**
 * Camera + real MediaPipe model + real photos of people. The fake camera shows
 * a man standing upright, or a man in a warrior-II pose (front knee bent like
 * the bottom of a lunge), so we can check detection and rep counting end to end.
 */
test.skip(!hasFixtures(), "pose model / photo fixtures not downloaded (offline?)");

test.beforeEach(async ({ context, baseURL }) => {
  await resetStripe();
  await subscribe(context, baseURL!);
});

async function openWorkout(page: Page, exercise: string) {
  await installFakeCamera(page);
  await page.goto(`/workout/${exercise}`);
  await expect(page.getByRole("heading", { name: "Get set up" })).toBeVisible({ timeout: 30_000 });
}

async function startSet(page: Page) {
  await page.getByRole("button", { name: /Start (set|anyway)/ }).click();
  await expect(page.getByTestId("rep-count")).toBeVisible({ timeout: 10_000 });
}

test("setup check stays amber with nobody in frame", async ({ page }) => {
  await openWorkout(page, "squat");
  await setScene(page, "empty");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("body-check")).toContainText("Step into the frame");
  await expect(page.getByTestId("body-check")).not.toContainText("Full body detected");
  await expect(page.getByRole("button", { name: "Start anyway" })).toBeVisible();
});

test("setup check turns green when a real person is fully in frame", async ({ page }) => {
  await openWorkout(page, "squat");
  await setScene(page, "standing");
  await expect(page.getByTestId("body-check")).toContainText("Full body detected", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Start set" })).toBeVisible();
  // Tips collapse so they don't hide the feet in the preview, and can be reopened.
  await expect(page.getByText(/Make sure your whole body/)).toBeHidden();
  await page.getByRole("button", { name: "Show tips" }).click();
  await expect(page.getByText(/Make sure your whole body/)).toBeVisible();
  await page.getByRole("button", { name: "Hide tips" }).click();
  await expect(page.getByText(/Make sure your whole body/)).toBeHidden();
  // The skeleton overlay is drawn on the canvas.
  const drawn = await page.evaluate(() => {
    const c = document.querySelector("canvas")!;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  expect(drawn).toBeGreaterThan(500);
});

test("countdown is spoken, and standing still never counts a rep", async ({ page }) => {
  await openWorkout(page, "squat");
  await setScene(page, "standing");
  await startSet(page);
  await page.waitForTimeout(4000);
  await expect(page.getByTestId("rep-count")).toHaveText("0");
  const said = await spoken(page);
  expect(said).toEqual(expect.arrayContaining(["3", "2", "1", "Go!"]));
});

test("a real lunge (standing → front knee bent → standing) counts one rep, spoken aloud", async ({ page }) => {
  await openWorkout(page, "lunge");
  await setScene(page, "standing");
  await startSet(page);
  await page.waitForTimeout(3500); // countdown + settle at the top

  await setScene(page, "warrior");
  await page.waitForTimeout(2000);
  await setScene(page, "standing");
  await expect(page.getByTestId("rep-count")).toHaveText("1", { timeout: 5000 });
  expect(await spoken(page)).toContain("One");

  // A second rep.
  await setScene(page, "warrior");
  await page.waitForTimeout(2000);
  await setScene(page, "standing");
  await expect(page.getByTestId("rep-count")).toHaveText("2", { timeout: 5000 });
  expect(await spoken(page)).toContain("Two");

  // Summary reflects the set.
  await page.getByRole("button", { name: "End" }).click();
  await expect(page.getByRole("heading", { name: "Lunge" })).toBeVisible();
  await expect(page.getByText("Total reps").locator("..")).toContainText("2");
  await expect(page.getByText("Most common form issue")).toBeVisible();
  const good = Number(await page.getByText("Good form").locator("..").locator("p").nth(1).textContent());
  const flagged = Number(await page.getByText("Flagged").locator("..").locator("p").nth(1).textContent());
  expect(good + flagged).toBe(2);

  // "Do another set" returns to setup with a fresh counter.
  await page.getByRole("button", { name: "Do another set" }).click();
  await expect(page.getByRole("heading", { name: "Get set up" })).toBeVisible({ timeout: 30_000 });
});

test("pausing stops rep counting until resumed", async ({ page }) => {
  await openWorkout(page, "lunge");
  await setScene(page, "standing");
  await startSet(page);
  await page.waitForTimeout(3500);

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused")).toBeVisible();
  await setScene(page, "warrior");
  await page.waitForTimeout(1500);
  await setScene(page, "standing");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("rep-count")).toHaveText("0");

  await page.getByRole("button", { name: "Resume" }).click();
  await page.waitForTimeout(1000);
  await setScene(page, "warrior");
  await page.waitForTimeout(2000);
  await setScene(page, "standing");
  await expect(page.getByTestId("rep-count")).toHaveText("1", { timeout: 5000 });
});

test("leaving the frame mid-set shows a warning", async ({ page }) => {
  await openWorkout(page, "squat");
  await setScene(page, "standing");
  await startSet(page);
  await page.waitForTimeout(3000);
  await setScene(page, "empty");
  await expect(page.getByText("Step into the frame")).toBeVisible({ timeout: 5000 });
});

test("mute silences the coach and is remembered", async ({ page }) => {
  await openWorkout(page, "lunge");
  await page.getByRole("button", { name: "Mute voice coach" }).click();
  await expect(page.getByRole("button", { name: "Unmute voice coach" })).toHaveAttribute("aria-pressed", "true");

  await setScene(page, "standing");
  await startSet(page);
  await page.waitForTimeout(3500);
  await setScene(page, "warrior");
  await page.waitForTimeout(2000);
  await setScene(page, "standing");
  await expect(page.getByTestId("rep-count")).toHaveText("1", { timeout: 5000 });
  expect(await spoken(page)).not.toContain("One");

  await page.reload();
  await expect(page.getByRole("button", { name: "Unmute voice coach" })).toBeVisible({ timeout: 30_000 });
});

test("switching cameras restarts the stream and un-mirrors the rear camera", async ({ page }) => {
  await openWorkout(page, "squat");
  await expect(page.locator("video")).toHaveClass(/-scale-x-100/);
  await page.getByRole("button", { name: "Switch camera" }).click();
  await expect(page.locator("video")).not.toHaveClass(/-scale-x-100/);
  await expect(page.getByRole("heading", { name: "Get set up" })).toBeVisible({ timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls)).toBe(2);
});

test("a denied camera permission shows a helpful error", async ({ page }) => {
  await installFakeCamera(page, { deny: true });
  await page.goto("/workout/squat");
  const alert = page.getByRole("alert").filter({ hasText: "Camera unavailable" });
  await expect(alert).toContainText("Camera permission was denied", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  // There's always a way back.
  await alert.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL("/");
});

test("the back button returns to the exercise list and releases the camera", async ({ page }) => {
  await openWorkout(page, "squat");
  await page.getByRole("link", { name: "Back to exercises" }).click();
  await expect(page).toHaveURL("/");
});
