import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { resetStripe } from "./helpers/auth";

const DAY = 864e5;

test.beforeEach(async () => {
  await resetStripe();
});

test("@ui progress shows an empty state before any workout", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "No workouts yet" })).toBeVisible();
  await expect(page.getByTestId("today-kcal")).toContainText("0");
  // Visitors are pointed to the subscription, not a locked workout.
  await expect(page.getByRole("link", { name: /Get FormAI Pro/ })).toHaveAttribute("href", "/pricing");
});

test("@ui progress totals calories, streak and form score from saved sets", async ({ page }) => {
  await page.addInitScript((DAY) => {
    const now = Date.now();
    const set = (daysAgo: number, kcal: number, reps: number, good: number, name = "Squat") => ({
      id: `${daysAgo}-${kcal}`,
      endedAt: now - daysAgo * DAY,
      exerciseId: name.toLowerCase(),
      exerciseName: name,
      reps,
      goodReps: good,
      flaggedReps: reps - good,
      kcal,
      durationMs: 60_000,
      topIssue: good < reps ? "Go a bit lower" : null,
    });
    localStorage.setItem(
      "formai:history",
      JSON.stringify([set(0, 60, 10, 9), set(0, 40, 10, 10, "Lunge"), set(1, 100, 20, 18), set(2, 50, 10, 10), set(9, 999, 5, 5)]),
    );
    localStorage.setItem("formai:profile", JSON.stringify({ weightKg: 80, unit: "kg", dailyGoalKcal: 250 }));
  }, DAY);
  await page.goto("/progress");

  await expect(page.getByTestId("today-kcal")).toContainText("100");
  await expect(page.getByText("150 kcal to your 250 kcal goal")).toBeVisible();
  await expect(page.getByTestId("week-kcal")).toContainText("250"); // the 9-day-old set is excluded
  await expect(page.getByTestId("streak")).toContainText("3");
  await expect(page.getByTestId("form-score")).toHaveText("94%"); // 47 of 50 reps
  await expect(page.getByTestId("recent-sets").locator("li")).toHaveCount(5);

  // Hovering (or focusing) a day's bar shows its details.
  await page.getByTestId("bar-6").hover();
  await expect(page.getByTestId("chart-tooltip")).toContainText("100 kcal");
  await expect(page.getByTestId("chart-tooltip")).toContainText("2 sets · 20 reps");
  // Each bar is also a labelled button for keyboard and screen-reader users.
  await expect(page.getByRole("button", { name: /: 100 kcal, 2 sets, 20 reps$/ })).toBeVisible();

  // A screen-reader table carries the same numbers.
  await expect(page.locator("table caption")).toHaveText("Calories burned per day, last 7 days");

  // No serious accessibility issues with the chart and data present.
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});

test("progress settings validate input and can clear history", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem(
      "formai:history",
      JSON.stringify([{ id: "a", endedAt: Date.now(), exerciseId: "squat", exerciseName: "Squat", reps: 5, goodReps: 5, flaggedReps: 0, kcal: 12, durationMs: 1, topIssue: null }]),
    );
  });
  await page.goto("/progress");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Daily goal (kcal)").fill("10");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Enter a goal between 50 and 5,000 kcal.")).toBeVisible();
  await page.getByLabel("Daily goal (kcal)").fill("400");
  await page.getByLabel("Weight").fill("65");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/· Daily goal: 400 kcal/)).toBeVisible();
  await expect(page.getByTestId("settings-weight")).toHaveText("65 kg");

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Clear workout history" }).click();
  await expect(page.getByRole("heading", { name: "No workouts yet" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "No workouts yet" })).toBeVisible();
  await expect(page.getByText(/· Daily goal: 400 kcal/)).toBeVisible();
});
