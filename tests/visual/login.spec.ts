import { test, expect } from "@playwright/test";

for (const [code, status, message] of [
  ["token_audience_mismatch", 401, "โทเคนไม่ได้รับอนุญาตสำหรับระบบ Barcode"],
  ["account_not_authorized", 403, "ข้อมูลพนักงานไม่ครบ"],
  ["token_expired", 401, "ข้อมูลยืนยันตัวตนหมดอายุ"],
] as const) {
  test(`initial login ${code} stays on login with its real reason`, async ({
    page,
  }, info) => {
    let sessions = 0;
    await page.route("**/api/session", (route) => {
      sessions++;
      return route.fulfill({
        status,
        json: { code, traceId: "login-test-reference" },
      });
    });
    await page.goto("/home?role=login-" + code);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByRole("alert")).toContainText("login-test-reference");
    await expect(
      page.getByRole("heading", { name: "เซสชันหมดอายุ", exact: true }),
    ).toHaveCount(0);
    expect(sessions).toBe(1);
    if (code === "token_audience_mismatch")
      await page.screenshot({
        path: info.outputPath("audience-mismatch-login.png"),
        fullPage: true,
      });
  });
}
