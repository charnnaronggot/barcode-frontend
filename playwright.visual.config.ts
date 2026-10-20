import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "test-results/visual",
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/visual", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4300",
    viewport: { width: 1920, height: 1080 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { channel: "chrome" },
  },
  webServer: {
    command: "node scripts/serve-visual.mjs",
    url: "http://127.0.0.1:4300",
    reuseExistingServer: false,
  },
});
