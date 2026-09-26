import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, E2E_COOKIE_SECRET, STRIPE_PORT } from "./e2e/helpers/constants";

/**
 * End-to-end tests run against a production build (`next start`) wired to a
 * local mock of the Stripe API (e2e/mock-stripe.mjs), so the whole paid flow
 * can be exercised without real payments or network access to Stripe.
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
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/pricing`,
      timeout: 240_000,
      env: {
        STRIPE_SECRET_KEY: "sk_test_e2e",
        STRIPE_API_BASE: `http://localhost:${STRIPE_PORT}`,
        FORMAI_COOKIE_SECRET: E2E_COOKIE_SECRET,
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
