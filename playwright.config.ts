import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/integration",
  outputDir: "test-results/integration",
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/integration", open: "never" }],
  ],
  use: {
    baseURL: process.env["BARCODE_WEB_URL"] || "http://localhost:4200",
    viewport: { width: 1920, height: 1080 },
    trace: "off",
    launchOptions: { channel: "chrome" },
  },
});
