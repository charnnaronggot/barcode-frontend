import { test, expect } from "@playwright/test";
import { fixture } from "./fixtures";
const jobId = "10000000-0000-0000-0000-000000000001";
const progress = {
  id: jobId,
  status: "running",
  total: 1010,
  succeeded: 350,
  skipped: 0,
  failed: 0,
  errors: [] as { id: number; message: string }[],
};
async function imported(page: import("@playwright/test").Page) {
  await page.goto("/import?role=hq");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "data.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("header\nvalue"),
    });
  await page.getByRole("button", { name: "ถัดไป: จับคู่คอลัมน์" }).click();
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันนำเข้า" }).click();
}
test("import success offers generation or later without rendering thousands of IDs", async ({
  page,
}) => {
  await fixture(page);
  let jobs = 0;
  await page.route("**/api/barcodes/import", (route) =>
    route.fulfill({
      json: { count: 1010, ids: Array.from({ length: 1010 }, (_, i) => i + 4) },
    }),
  );
  await page.route("**/api/barcodes/generation-jobs", (route) => {
    jobs++;
    return route.fulfill({ status: 202, json: progress });
  });
  await imported(page);
  await expect(page.getByRole("status")).toContainText("1010 รายการ");
  await expect(
    page.getByRole("button", { name: "สร้าง Barcode ทั้งหมด" }),
  ).toBeVisible();
  await expect(page.locator(".import-result")).toHaveCount(0);
  expect((await page.getByRole("status").innerText()).length).toBeLessThan(250);
  await page.getByRole("button", { name: "ทำภายหลัง" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(jobs).toBe(0);
});
test("import batch runs in background, survives navigation and retries failed items", async ({
  page,
}, info) => {
  await fixture(page);
  let current = structuredClone(progress);
  const starts: { url: string; ids: number[] }[] = [];
  let retries = 0;
  await page.route("**/api/barcodes/generation-jobs", async (route) => {
    starts.push({
      url: route.request().url(),
      ids: route.request().postDataJSON().ids,
    });
    await route.fulfill({ status: 202, json: current });
  });
  await page.route(`**/api/barcodes/generation-jobs/${jobId}`, (route) =>
    route.fulfill({ json: current }),
  );
  await page.route(
    `**/api/barcodes/generation-jobs/${jobId}/retry`,
    (route) => {
      retries++;
      current = { ...current, status: "running" };
      return route.fulfill({ status: 202, json: current });
    },
  );
  await imported(page);
  await page.getByRole("button", { name: "สร้าง Barcode ทั้งหมด" }).click();
  const panel = page.getByRole("region", { name: "ความคืบหน้าสร้าง Barcode" });
  await expect(panel).toContainText("350");
  expect(starts[0].ids).toEqual([1002]);
  expect(starts[0].url).toContain("/report/api/");
  await page.getByRole("link", { name: "รายการ Barcode", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("button", { name: "สร้าง Barcode ทั้งหมด", exact: true }),
  ).toBeDisabled();
  current = {
    ...current,
    status: "completed",
    succeeded: 1009,
    failed: 1,
    errors: [{ id: 1010, message: "สร้าง Barcode ไม่สำเร็จ กรุณาลองใหม่" }],
  };
  await expect(panel).toContainText("สร้าง Barcode เสร็จแล้ว");
  await page.screenshot({
    path: info.outputPath("bulk-failure-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: info.outputPath("bulk-failure-mobile.png"),
    fullPage: true,
  });
  await panel
    .getByRole("button", { name: "ลองใหม่เฉพาะรายการที่ไม่สำเร็จ" })
    .click();
  expect(retries).toBe(1);
  expect(starts).toHaveLength(1);
  current = {
    ...current,
    status: "completed",
    succeeded: 1010,
    failed: 0,
    errors: [],
  };
  await expect(panel).toContainText("สำเร็จ 1010");
  await panel.getByRole("button", { name: "ปิดความคืบหน้า" }).click();
  await expect(panel).toHaveCount(0);
});
test("list starts all missing and retries job submission using the same request key", async ({
  page,
}) => {
  await fixture(page);
  const keys: string[] = [];
  await page.route("**/api/barcodes/generation-jobs", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toEqual({});
    await route.fulfill(
      keys.length === 1
        ? { status: 503, json: { message: "response lost" } }
        : { status: 202, json: progress },
    );
  });
  await page.route(`**/api/barcodes/generation-jobs/${jobId}`, (route) =>
    route.fulfill({ json: progress }),
  );
  await page.goto("/barcodes?role=hq");
  await page.getByRole("button", { name: "สร้าง Barcode ทั้งหมด" }).click();
  await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "ความคืบหน้าสร้าง Barcode" }),
  ).toBeVisible();
  expect(keys[0]).toBe(keys[1]);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("barcode-session-cleared")),
  );
  await expect(
    page.getByRole("region", { name: "ความคืบหน้าสร้าง Barcode" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("barcode-generation-job")),
  ).toBeNull();
});
