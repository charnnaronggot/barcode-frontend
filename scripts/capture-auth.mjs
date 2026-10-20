// Run manually for each provisioned test account; files contain tokens and must remain private.
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import readline from "node:readline/promises";
const url = process.env.BARCODE_WEB_URL;
const output = process.argv[2];
if (!url || !output)
  throw new Error("Set BARCODE_WEB_URL and pass an auth-state filename.");
const browser = await chromium.launch({ channel: "chrome", headless: false });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(new URL("/login", url).href);
  const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await input.question(
    "Sign in with the intended test account in this browser, then press Enter here. ",
  );
  input.close();
  const state = await context.storageState();
  const sessionStorage = await page.evaluate(() => ({
    origin: location.origin,
    values: Object.fromEntries(Object.entries(window.sessionStorage)),
  }));
  await fs.writeFile(
    output,
    JSON.stringify({ ...state, sessionStorage }, null, 2),
    { mode: 0o600 },
  );
} finally {
  await browser.close();
}
