import { test, expect } from "@playwright/test";
import { fixture, realPdf, generated, original } from "./fixtures";
test("branch list matches the three-column design and has no HQ actions", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/barcodes");
  await expect(
    page.getByRole("heading", { name: "เอกสารของ สาขากรุงเทพ" }),
  ).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(3);
  await expect(page.locator("nav")).not.toContainText("ภาพรวม");
  await expect(
    page.getByRole("link", { name: "+ สร้างรายการใหม่" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: original.textLevel1, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("branch-list-1920.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: info.outputPath("branch-list-mobile.png"),
    fullPage: true,
  });
});
test("generation error retains old PDF and retries the same idempotency key", async ({
  page,
}, info) => {
  const data = await fixture(page);
  let attempts = 0;
  const keys: string[] = [];
  await page.route("**/api/barcodes/1001/generate", async (route) => {
    attempts++;
    keys.push(route.request().headers()["idempotency-key"]);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (attempts === 1)
      return route.fulfill({
        status: 500,
        json: { message: "สร้าง Barcode ไม่สำเร็จ เอกสารเดิมยังคงอยู่" },
      });
    data.update({
      ...structuredClone(original),
      files: [{ ...generated, uuid: "00000000-0000-0000-0000-000000000002" }],
    });
    return route.fulfill({
      status: 201,
      json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
    });
  });
  await page.goto("/barcodes/1001?role=hq");
  await expect(page.locator("iframe")).toBeVisible();
  const old = await page.locator("iframe").getAttribute("src");
  await page.getByRole("button", { name: "อัปเดตไฟล์ Barcode" }).click();
  await expect(page.getByRole("status")).toContainText("กำลังสร้าง Barcode");
  await expect(
    page.getByRole("button", { name: "อัปเดตไฟล์ Barcode" }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("ไม่สำเร็จ");
  await expect(page.locator("iframe")).toHaveAttribute("src", old!);
  await page.screenshot({
    path: info.outputPath("hq-detail-generation-error.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "ลองใหม่" }).click();
  await expect(page.getByRole("status")).toContainText("สร้าง Barcode สำเร็จ");
  await expect(page.locator(".document-heading")).not.toContainText("ฉบับ");
  expect(attempts).toBe(2);
  expect(keys[0]).toBe(keys[1]);
  await expect(page.locator(".signature-replacement")).toHaveCount(1);
});
test("HQ upload sends current file UUID and actual file with retry", async ({
  page,
}) => {
  await fixture(page);
  let attempts = 0;
  const keys: string[] = [];
  await page.route("**/api/barcodes/1001/signed", async (route) => {
    expect(route.request().postData()).not.toContain('name="revisionId"');
    expect(route.request().postData()).toContain('filename="signed.pdf"');
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer visual-test-token",
    );
    keys.push(route.request().headers()["idempotency-key"]);
    await route.fulfill({
      status: ++attempts === 1 ? 500 : 201,
      json: attempts === 1 ? { message: "อัปโหลดไม่สำเร็จ" } : { id: 1001 },
    });
  });
  await page.goto("/barcodes/1001?role=hq");
  await page.locator(".signature-replacement summary").click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "signed.pdf",
      mimeType: "application/pdf",
      buffer: realPdf(),
    });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "อัปโหลดใบลายมือชื่อ" }).click();
  await expect(page.getByRole("status")).toContainText("ไม่สำเร็จ");
  await page.getByRole("button", { name: "ลองใหม่" }).click();
  await expect(page.getByRole("status")).toContainText(
    "อัปโหลดใบลายมือชื่อสำเร็จ",
  );
  expect(keys[0]).toBe(keys[1]);
});
test("HQ import selects file, maps columns, previews and commits", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/import?role=hq");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "thai.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "branch_id,comp,tax,suffix,ref_1,text_level_1,text_level_2,text_level_3\n101,POST,0012345678901,00,00001,หนึ่ง,สอง,สาม",
      ),
    });
  await page.getByRole("button", { name: "ถัดไป: จับคู่คอลัมน์" }).click();
  await expect(
    page.getByRole("heading", { name: "เลือก Sheet และจับคู่คอลัมน์" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await expect(page.getByText("ข้อมูลผ่านการตรวจสอบ 1 รายการ")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("import-review.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "ยืนยันนำเข้า" }).click();
  await expect(page.getByRole("status")).toContainText("นำเข้าข้อมูลสำเร็จ");
  await expect(page.locator(".import-result")).toHaveCount(0);
  await expect(page.locator("input[type=file]")).toBeAttached();
});
test("branch route guard rejects HQ pages", async ({ page }) => {
  await fixture(page);
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/barcodes$/);
  await expect(page.getByRole("status")).toContainText(
    "คุณไม่มีสิทธิ์ดำเนินการนี้",
  );
  await expect(
    page.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าใช้งาน" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "ดูเอกสาร", exact: true }),
  ).toBeVisible();
});

test("old forbidden URL redirects to the permitted list without the removed screen", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/forbidden");
  await expect(page).toHaveURL(/\/barcodes$/);
  await expect(page.locator(".access-brand")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าใช้งาน" }),
  ).toHaveCount(0);
});

test("unauthenticated old forbidden URL returns to the BAAC login", async ({
  page,
}) => {
  await page.goto("/forbidden?role=anonymous");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย BAAC Account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าใช้งาน" }),
  ).toHaveCount(0);
});

test("callback without a session returns to login instead of the removed screen", async ({
  page,
}) => {
  await page.goto("/home?role=anonymous");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย BAAC Account" }),
  ).toBeVisible();
  await expect(page.locator(".access-brand")).toHaveCount(0);
});
test("Thai login has a disabled partner choice", async ({ page }, info) => {
  await page.goto("/login?role=anonymous");
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย BAAC Account" }),
  ).toBeVisible();
  await expect(page.locator(".login-project.disabled")).toContainText(
    "โครงการพันธมิตร",
  );
  await page.screenshot({
    path: info.outputPath("login-1920.png"),
    fullPage: true,
  });
});
test("HQ creates without a client ID and edits using the current concurrency version", async ({
  page,
}) => {
  const fixtureData = await fixture(page);
  await page.route("**/api/barcodes/1001/generate", (route) =>
    route.fulfill({
      status: 201,
      json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
    }),
  );
  await page.route("**/api/barcodes", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON();
    expect(body.id).toBeUndefined();
    expect(body.tax).toBe("0012345678901");
    expect(body.textLevel1).toBe("หนึ่ง");
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    fixtureData.update({ ...structuredClone(original), ...body });
    return route.fulfill({
      status: 201,
      json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
    });
  });
  await page.route("**/api/barcodes/1001", async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON();
    expect(body.rowVersion).toBe(original.rowVersion);
    expect(body.data.textLevel3).toBe("แก้ไขแล้ว");
    fixtureData.update({ ...structuredClone(original), ...body.data });
    return route.fulfill({
      json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
    });
  });
  await page.goto("/barcodes/new?role=hq");
  await page
    .getByRole("combobox", { name: "สาขาเจ้าของรายการ *", exact: true })
    .click();
  await page
    .getByRole("option", { name: "สาขากรุงเทพ (101)", exact: true })
    .click();
  await page.getByLabel("เลขประจำตัวผู้เสียภาษี").fill("0012345678901");
  await page.getByLabel("Suffix").fill("00");
  await page.getByLabel("เลขอ้างอิง 1").fill("00001");
  for (const [label, value] of [
    ["ข้อความบรรทัดที่ 1", "หนึ่ง"],
    ["ข้อความบรรทัดที่ 2", "สอง"],
    ["ข้อความบรรทัดที่ 3", "สาม"],
  ])
    await page.getByLabel(label).fill(value);
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page
    .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
    .click();
  await expect(page).toHaveURL(/\/barcodes\/1001\/document$/);
  await page.getByRole("link", { name: "แก้ไขข้อมูล", exact: true }).click();
  await expect(page.getByLabel("สาขาเจ้าของรายการ")).toBeDisabled();
  await page.getByLabel("ข้อความบรรทัดที่ 3").fill("แก้ไขแล้ว");
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await page
    .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
    .click();
  await expect(page).toHaveURL(/\/barcodes\/1001\/document$/);
});
test("import errors show row and column and prevent commit", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/barcodes/import/preview", (route) =>
    route.fulfill({
      json: {
        sheets: [],
        sheet: 0,
        headers: [
          "branch_id",
          "comp",
          "tax",
          "suffix",
          "ref_1",
          "text_level_1",
          "text_level_2",
          "text_level_3",
        ],
        sample: [],
        count: 2,
        errors: [
          { row: 4, column: "branch_id", message: "สาขาปิดใช้งาน" },
          { row: 7, column: "tax", message: "ข้อมูลไม่ถูกต้อง" },
        ],
      },
    }),
  );
  await page.goto("/import?role=hq");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("headers\ninvalid"),
    });
  await page.getByRole("button", { name: "ถัดไป: จับคู่คอลัมน์" }).click();
  await page
    .getByRole("button", { name: "ตรวจสอบข้อมูล", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "branch_id", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "7", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ยืนยันนำเข้า" }),
  ).toBeDisabled();
});
test("HQ manages branch status and reads audit history", async ({ page }) => {
  await fixture(page);
  let active = true;
  await page.route("**/api/branches", (route) =>
    route.fulfill({
      json: [{ id: 101, name: "สาขากรุงเทพ", isActive: active, count: 1 }],
    }),
  );
  await page.route("**/api/branches/101", (route) => {
    active = route.request().postDataJSON().isActive;
    return route.fulfill({
      json: { id: 101, name: "สาขากรุงเทพ", isActive: active, count: 1 },
    });
  });
  await page.goto("/branches?role=hq");
  await page.getByRole("link", { name: "เปิดรายละเอียด", exact: true }).click();
  await page.getByRole("link", { name: "แก้ไขสาขา", exact: true }).click();
  await page
    .getByRole("combobox", { name: "สถานะการใช้งาน", exact: true })
    .click();
  await page.getByRole("option", { name: "ปิดใช้งาน", exact: true }).click();
  await page.getByRole("button", { name: "บันทึกสาขา" }).click();
  await expect(page.locator(".organization-card")).toContainText("ปิดใช้งาน");
  await page.route("**/api/audit-logs*", (route) =>
    route.fulfill({
      headers: { "X-Total-Count": "1" },
      json: [
        {
          id: 1,
          barcodeId: 1001,
          branchId: 101,
          action: "update-draft",
          actorIssuer: "https://identity.test/realms/internal",
          actorSubject: "hq-user",
          createdUtc: "2026-10-12T10:00:00Z",
          detailsJson: '{"changed":"draft"}',
        },
      ],
    }),
  );
  await page.goto("/history?role=hq");
  await expect(
    page.getByRole("cell", { name: "แก้ไขแบบร่าง", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "hq-user", exact: false }),
  ).toBeVisible();
});
test("logout revokes document blob URLs and clears the workspace", async ({
  page,
}) => {
  const revoked: string[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("revoked:")) revoked.push(message.text());
  });
  await page.addInitScript(() => {
    const original = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      console.debug("revoked:" + url);
      original(url);
    };
  });
  await fixture(page);
  await page.goto("/barcodes/1001");
  await expect(page.locator("iframe")).toBeVisible();
  await page.getByLabel("เมนูบัญชี").click();
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".workspace")).toHaveCount(0);
  expect(revoked.length).toBeGreaterThan(0);
});
test("reconfirming an import after a lost response keeps its request key", async ({
  page,
}) => {
  await fixture(page);
  const keys: string[] = [];
  await page.route("**/api/barcodes/import", (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    return route.fulfill({
      status: keys.length === 1 ? 500 : 201,
      json:
        keys.length === 1
          ? { message: "การตอบกลับขาดหาย" }
          : { count: 1, ids: [1002] },
    });
  });
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
  await expect(page.getByRole("status")).toContainText("การตอบกลับขาดหาย");
  await page.getByRole("button", { name: "ยืนยันนำเข้า" }).click();
  await expect(page.getByRole("status")).toContainText("นำเข้าข้อมูลสำเร็จ");
  await expect(page.locator(".import-result")).toHaveCount(0);
  await expect(page.locator("input[type=file]")).toBeAttached();
  expect(keys[0]).toBe(keys[1]);
});
