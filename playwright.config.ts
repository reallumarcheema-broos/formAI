import { defineConfig, devices } from "@playwright/test";
import { AI_PORT, APP_PORT, E2E_COOKIE_SECRET, STRIPE_PORT } from "./e2e/helpers/constants";

/**
 * End-to-end tests run against a production build (`next start`) wired to
 * local mocks of the Stripe API (e2e/mock-stripe.mjs) and the Anthropic API
 * (e2e/mock-anthropic.mjs), so the paid flow and the food scanner can be
 * exercised without real payments, API costs or network access.
 */
const PORT = APP_PORT;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      args: ["--autoplay-policy=no-user-gesture-required", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    {
      // iPhone viewport/touch emulation on Chromium (WebKit isn't bundled here).
      name: "iphone",
      grep: /@ui/,
      use: { ...devices["iPhone 13"], browserName: "chromium", defaultBrowserType: "chromium" },
    },
    { name: "android", grep: /@ui/, use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node e2e/mock-stripe.mjs",
      url: `http://localhost:${STRIPE_PORT}/health`,
      env: { MOCK_STRIPE_PORT: String(STRIPE_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node e2e/mock-anthropic.mjs",
      url: `http://localhost:${AI_PORT}/health`,
      env: { MOCK_AI_PORT: String(AI_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/pricing`,
      timeout: 240_000,
      env: {
        STRIPE_SECRET_KEY: "sk_test_e2e",
        STRIPE_API_BASE: `http://localhost:${STRIPE_PORT}`,
        FORMAI_COOKIE_SECRET: E2E_COOKIE_SECRET,
        ANTHROPIC_API_KEY: "sk-ant-test",
        ANTHROPIC_BASE_URL: `http://localhost:${AI_PORT}`,
        // The suite scans more than a real user would in a day.
        FORMAI_FOOD_DAILY_LIMIT: "100",
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
