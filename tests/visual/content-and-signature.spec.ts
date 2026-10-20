import { test, expect } from "@playwright/test";
import { fixture, original, generated, realPdf } from "./fixtures";
test("list signature action opens upload directly and never saves or generates a Barcode", async ({
  page,
}) => {
  await fixture(page);
  let saves = 0,
    generations = 0,
    uploads = 0;
  await page.route("**/api/barcodes/1001", (r) => {
    if (r.request().method() === "PUT") saves++;
    return r.fallback();
  });
  await page.route("**/api/barcodes/1001/generate", (r) => {
    generations++;
    return r.fulfill({ json: { id: 1001, uuid: generated.uuid } });
  });
  await page.route("**/api/barcodes/1001/signed", (r) => {
    uploads++;
    expect(r.request().postData()).toContain(generated.uuid);
    return r.fulfill({ status: 201, json: { id: 1001, uuid: "signed" } });
  });
  await page.goto("/barcodes?role=hq");
  await expect(
    page.getByRole("columnheader", { name: "วันที่สร้าง", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", { name: "อัปเดตล่าสุด", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "ดูเอกสาร / แนบใบลายมือชื่อ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/barcodes\/1001\/document#signature$/);
  await expect(page.locator(".signature-replacement")).toHaveAttribute(
    "open",
    "",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "signature.pdf",
      mimeType: "application/pdf",
      buffer: realPdf(),
    });
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "อัปโหลดใบลายมือชื่อ", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "อัปโหลดใบลายมือชื่อสำเร็จ",
  );
  expect(uploads).toBe(1);
  expect(saves).toBe(0);
  expect(generations).toBe(0);
});
test("unchanged editor attaches to the existing PDF without a generation request", async ({
  page,
}) => {
  await fixture(page);
  let generations = 0,
    uploads = 0;
  await page.route("**/api/barcodes/1001", (r) =>
    r.request().method() === "PUT"
      ? r.fulfill({
          json: { id: 1001, uuid: generated.uuid, fileType: "generated" },
        })
      : r.fallback(),
  );
  await page.route("**/api/barcodes/1001/generate", (r) => {
    generations++;
    return r.fulfill({ json: { id: 1001, uuid: generated.uuid } });
  });
  await page.route("**/api/barcodes/1001/signed", (r) => {
    uploads++;
    expect(r.request().postData()).toContain(generated.uuid);
    return r.fulfill({ status: 201, json: { id: 1001 } });
  });
  await page.goto("/barcodes/1001/edit?role=hq");
  await page.getByLabel("ข้อความบรรทัดที่ 1").waitFor();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "signature.pdf",
      mimeType: "application/pdf",
      buffer: realPdf(),
    });
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "อัปโหลดใบลายมือชื่อ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/barcodes\/1001\/document$/);
  expect(generations).toBe(0);
  expect(uploads).toBe(1);
});
test("duplicate content is explained without treating it as a stale draft", async ({
  page,
}) => {
  await fixture(page);
  let reads = 0,
    generations = 0;
  await page.route("**/api/barcodes/1001", (r) => {
    if (r.request().method() === "PUT")
      return r.fulfill({
        status: 409,
        json: {
          code: "duplicate_barcode",
          existingId: 1100,
          message: "ข้อมูลซ้ำกับรายการ 1100 กรุณาเปิดรายการเดิม",
        },
      });
    reads++;
    return r.fallback();
  });
  await page.route("**/api/barcodes/1001/generate", (r) => {
    generations++;
    return r.fulfill({ json: { id: 1001 } });
  });
  await page.goto("/barcodes/1001/edit?role=hq");
  await page.getByLabel("ข้อความบรรทัดที่ 1").fill("ข้อมูลซ้ำ");
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page
    .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("1100");
  await expect(
    page.getByRole("button", { name: "เปิดรายการเดิม" }),
  ).toBeVisible();
  await expect(page.getByLabel("ข้อความบรรทัดที่ 1")).toHaveValue("ข้อมูลซ้ำ");
  await expect(page.getByLabel("ข้อความบรรทัดที่ 1")).toBeEnabled();
  expect(reads).toBe(1);
  expect(generations).toBe(0);
});
test("only signed-file history is displayed", async ({ page }) => {
  const data = await fixture(page);
  data.update({
    ...original,
    files: [
      generated,
      {
        ...generated,
        uuid: "old-generated",
        isActive: false,
        originalName: "old-barcode.pdf",
      },
    ],
  });
  await page.goto("/barcodes/1001/document?role=hq");
  await expect(
    page.getByText("ประวัติใบลายมือชื่อที่ถูกแทน", { exact: true }),
  ).toHaveCount(0);
});
test("import duplicate detected at commit returns to row errors without retrying blindly", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/barcodes/import", (r) =>
    r.fulfill({
      status: 409,
      json: {
        code: "import_validation",
        message: "กรุณาแก้ข้อมูลที่ซ้ำหรือไม่ถูกต้องก่อนนำเข้า",
        errors: [
          { row: 2, column: "data", message: "ข้อมูลซ้ำกับรายการ 1100 ในระบบ" },
        ],
      },
    }),
  );
  await page.goto("/import?role=hq");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "duplicate.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("header\nvalue"),
    });
  await page.getByRole("button", { name: "ถัดไป: จับคู่คอลัมน์" }).click();
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page.getByRole("button", { name: "ยืนยันนำเข้า" }).click();
  await expect(
    page.getByRole("cell", { name: "ข้อมูลซ้ำกับรายการ 1100 ในระบบ" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ยืนยันนำเข้า" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "ลองใหม่", exact: true }),
  ).toHaveCount(0);
});
