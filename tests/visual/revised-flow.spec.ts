import { test, expect } from "@playwright/test";
import { fixture, realPdf, original, generated } from "./fixtures";

test("replaced Barcode requires rechecking before a signature can be attached", async ({
  page,
}) => {
  const data = await fixture(page);
  let uploads = 0;
  await page.route("**/api/barcodes/1001/signed", (route) => {
    uploads++;
    expect(route.request().postData()).toContain(
      'name="generatedFileUuid"\r\n\r\n' + generated.uuid,
    );
    data.update({
      ...original,
      files: [{ ...generated, uuid: "00000000-0000-0000-0000-000000000002" }],
    });
    return route.fulfill({ status: 409, json: { message: "Barcode changed" } });
  });
  await page.goto("/barcodes/1001/document?role=hq");
  await page.locator(".signature-replacement summary").click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "old-signature.pdf",
      mimeType: "application/pdf",
      buffer: realPdf(),
    });
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "อัปโหลดใบลายมือชื่อ", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("เอกสารเปลี่ยนแปลงแล้ว");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "อัปโหลดใบลายมือชื่อ", exact: true }),
  ).toBeDisabled();
  expect(uploads).toBe(1);
});

test("editor load failure can retry without enabling an empty form", async ({
  page,
}) => {
  await fixture(page);
  let attempts = 0;
  await page.route("**/api/barcodes/1001", (route) =>
    ++attempts === 1
      ? route.fulfill({ status: 503, json: { message: "โหลดไม่สำเร็จ" } })
      : route.fallback(),
  );
  await page.goto("/barcodes/1001/edit?role=hq");
  await expect(page.getByRole("status")).toContainText("โหลดไม่สำเร็จ");
  await expect(
    page.getByRole("button", { name: "ตรวจสอบข้อมูล" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();
  await expect(page.getByLabel("ข้อความบรรทัดที่ 1")).toHaveValue(
    original.textLevel1,
  );
  await expect(
    page.getByRole("button", { name: "ตรวจสอบข้อมูล" }),
  ).toBeEnabled();
});

test("current document and historical files display without a revision selector", async ({
  page,
}) => {
  const data = await fixture(page);
  data.update({
    ...original,
    files: [
      generated,
      {
        ...generated,
        fileType: "signed",
        isActive: false,
        uuid: "00000000-0000-0000-0000-000000000009",
        originalName: "old.pdf",
      },
    ],
  });
  await page.goto("/barcodes/1001/document?role=hq");
  await expect(page.locator(".document-pair iframe")).toHaveCount(1);
  await expect(page.locator(".document-heading select")).toHaveCount(0);
  await page.getByText("ประวัติใบลายมือชื่อที่ถูกแทน", { exact: true }).click();
  await page.getByRole("button", { name: /old.pdf/ }).click();
  await expect(page.locator("iframe")).toHaveCount(2);
});

test("signed PNG is displayed from its authenticated API blob", async ({
  page,
}) => {
  const data = await fixture(page);
  const uuid = "00000000-0000-0000-0000-000000000004";
  data.update({
    ...original,
    hasSignedFile: true,
    status: "signed",
    files: [
      generated,
      {
        ...generated,
        uuid,
        fileType: "signed",
        contentType: "image/png",
        originalName: "signature.png",
      },
    ],
  });
  await page.route("**/api/files/" + uuid, (route) => {
    expect(route.request().headers()["authorization"]).toBe(
      "Bearer visual-test-token",
    );
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhVQAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.goto("/barcodes/1001/document");
  await expect(
    page.getByAltText("ใบลายมือชื่อ", { exact: true }),
  ).toHaveJSProperty("naturalWidth", 1);
  await expect(
    page.getByAltText("ใบลายมือชื่อ", { exact: true }),
  ).toHaveAttribute("src", /^blob:/);
  await expect(page.locator(".document-pair iframe")).toHaveCount(1);
});

for (const failure of ["save", "generate", "upload"]) {
  test(`edit retries only failed ${failure} stage and attaches the current Barcode`, async ({
    page,
  }, info) => {
    const data = await fixture(page);
    const counts = { save: 0, generate: 0, upload: 0 };
    const keys: Record<string, string[]> = {
      save: [],
      generate: [],
      upload: [],
    };
    let row = structuredClone(original);
    await page.route("**/api/barcodes/1001", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      counts.save++;
      keys.save.push(route.request().headers()["idempotency-key"]);
      if (failure === "save" && counts.save === 1)
        return route.fulfill({
          status: 500,
          json: { message: "บันทึกไม่สำเร็จ" },
        });
      row = { ...row, ...route.request().postDataJSON().data };
      data.update(row);
      return route.fulfill({ json: { id: 1001 } });
    });
    await page.route("**/api/barcodes/1001/generate", async (route) => {
      counts.generate++;
      keys.generate.push(route.request().headers()["idempotency-key"]);
      expect(route.request().url()).toContain("/report/");
      expect(route.request().headers()["authorization"]).toBe(
        "Bearer visual-test-token",
      );
      if (failure === "generate" && counts.generate === 1)
        return route.fulfill({
          status: 500,
          json: { message: "สร้าง Barcode ไม่สำเร็จ เอกสารเดิมยังคงอยู่" },
        });
      row = {
        ...row,
        files: [{ ...generated, uuid: "00000000-0000-0000-0000-000000000002" }],
      };
      data.update(row);
      return route.fulfill({
        status: 201,
        json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
      });
    });
    await page.route("**/api/barcodes/1001/signed", async (route) => {
      counts.upload++;
      keys.upload.push(route.request().headers()["idempotency-key"]);
      expect(route.request().url()).toContain("/command/");
      expect(route.request().postData()).not.toContain('name="revisionId"');
      expect(route.request().postData()).toContain('filename="signed-new.pdf"');
      if (failure === "upload" && counts.upload === 1)
        return route.fulfill({
          status: 500,
          json: { message: "อัปโหลดไม่สำเร็จ" },
        });
      data.update({
        ...row,
        hasSignedFile: true,
        status: "signed",
        files: [
          ...row.files,
          {
            ...generated,
            uuid: "00000000-0000-0000-0000-000000000003",
            fileType: "signed",
            originalName: "signed-new.pdf",
          },
        ],
      });
      return route.fulfill({
        status: 201,
        json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
      });
    });
    await page.goto("/barcodes/1001/edit?role=hq");
    await page.getByLabel("ข้อความบรรทัดที่ 1").fill("ข้อมูลแก้ไขภาษาไทย");
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "signed-new.pdf",
        mimeType: "application/pdf",
        buffer: realPdf(),
      });
    await page.getByRole("button", { name: "ตรวจสอบข้อมูล" }).click();
    await expect(page.getByRole("dialog")).toContainText("ข้อมูลแก้ไขภาษาไทย");
    expect(counts.save).toBe(0);
    await page
      .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("ไม่สำเร็จ");
    await expect(
      page.getByRole("button", { name: "ตรวจสอบข้อมูล" }),
    ).toBeDisabled();
    await expect(
      page.locator('iframe[title="ใบ Barcode ฉบับก่อน PDF"]'),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`retry-${failure}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "ลองใหม่", exact: true }).click();
    await expect(page).toHaveURL(/\/barcodes\/1001\/document$/);
    await expect(page.locator(".document-pair iframe")).toHaveCount(2);
    await expect(page.getByRole("status")).toContainText("แนบใบลายมือชื่อแล้ว");
    for (const stage of ["save", "generate", "upload"] as const) {
      expect(counts[stage]).toBe(stage === failure ? 2 : 1);
      expect(new Set(keys[stage]).size).toBe(1);
    }
  });
}

test("stale draft reloads latest data and requires a new preview", async ({
  page,
}) => {
  const data = await fixture(page);
  const keys: string[] = [];
  await page.route("**/api/barcodes/1001", (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) {
      data.update({
        ...original,
        textLevel1: "ข้อมูลใหม่จากเจ้าหน้าที่อื่น",
        rowVersion: "NEWVERSION",
      });
      return route.fulfill({ status: 409, json: { message: "Stale draft" } });
    }
    expect(route.request().postDataJSON().rowVersion).toBe("NEWVERSION");
    data.update({
      ...original,
      ...route.request().postDataJSON().data,
      rowVersion: "NEXTVERSION",
    });
    return route.fulfill({ json: { id: 1001 } });
  });
  await page.route("**/api/barcodes/1001/generate", (route) =>
    route.fulfill({
      status: 201,
      json: { id: 1001, uuid: "00000000-0000-0000-0000-000000000002" },
    }),
  );
  await page.goto("/barcodes/1001/edit?role=hq");
  await page.getByLabel("ข้อความบรรทัดที่ 1").fill("ฉบับที่ล้าสมัย");
  await page.getByRole("button", { name: "ตรวจสอบข้อมูล" }).click();
  await page
    .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "โหลดข้อมูลล่าสุดให้แล้ว",
  );
  await expect(page.getByLabel("ข้อความบรรทัดที่ 1")).toHaveValue(
    "ข้อมูลใหม่จากเจ้าหน้าที่อื่น",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "ตรวจสอบข้อมูล" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "ตรวจสอบข้อมูล" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "ข้อมูลใหม่จากเจ้าหน้าที่อื่น",
  );
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  await expect(page).toHaveURL(/\/document$/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("branch sees both actual documents and has no write actions", async ({
  page,
}, info) => {
  const data = await fixture(page);
  data.update({
    ...original,
    hasSignedFile: true,
    status: "signed",
    files: [
      generated,
      {
        ...generated,
        uuid: "00000000-0000-0000-0000-000000000003",
        fileType: "signed",
        originalName: "signed.pdf",
      },
    ],
  });
  await page.goto("/barcodes/1001/document");
  await expect(page.locator(".document-pair iframe")).toHaveCount(2);
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "แก้ไขข้อมูล" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /สร้าง Barcode/ })).toHaveCount(
    0,
  );
  for (const frame of await page.locator("iframe").all())
    expect(await frame.getAttribute("src")).toMatch(/^blob:/);
  await page.screenshot({
    path: info.outputPath("branch-two-documents-1920.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: info.outputPath("branch-two-documents-mobile.png"),
    fullPage: true,
  });
});

test("HQ filters are independent and audit search is sent before pagination", async ({
  page,
}) => {
  await fixture(page);
  const requests: URL[] = [];
  await page.route("**/api/barcodes?*", (route) => {
    requests.push(new URL(route.request().url()));
    return route.fallback();
  });
  await page.goto("/barcodes?role=hq");
  await page
    .getByRole("combobox", { name: "สถานะ Barcode", exact: true })
    .click();
  await page
    .getByRole("option", { name: "สร้าง Barcode แล้ว", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "ใบลายมือชื่อ", exact: true })
    .click();
  await page.getByRole("option", { name: "ยังไม่ได้แนบ", exact: true }).click();
  await expect
    .poll(() => requests.at(-1)?.searchParams.get("signatureStatus"))
    .toBe("unsigned");
  expect(requests.at(-1)?.searchParams.get("barcodeStatus")).toBe("generated");
  expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
  await expect
    .poll(() => requests.at(-1)?.searchParams.get("barcodeStatus"))
    .toBe("");
  await page.goto("/history?role=hq");
  await page.getByLabel("ค้นหา", { exact: true }).fill("hq-user");
  const request = page.waitForRequest(
    (r) =>
      r.url().includes("/api/audit-logs?") &&
      new URL(r.url()).searchParams.get("search") === "hq-user",
  );
  await page.getByRole("button", { name: "ค้นหา", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("page")).toBe("1");
});

test("latest screens and static asset geometry match the design slots", async ({
  page,
}, info) => {
  await fixture(page);
  for (const [name, path] of [
    ["hq-list", "/barcodes"],
    ["create", "/barcodes/new"],
    ["edit", "/barcodes/1001/edit"],
    ["hq-documents", "/barcodes/1001/document"],
    ["branches", "/branches"],
    ["branch-details", "/branches/101"],
    ["branch-edit", "/branches/101/edit"],
    ["history", "/history"],
    ["import-file", "/import"],
  ]) {
    await page.goto(path + "?role=hq");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".spinner")).toHaveCount(0);
    for (const img of await page.locator(".sidebar img,.topbar img").all()) {
      await expect(img).toHaveJSProperty("complete", true);
      expect(
        await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      ).toBeGreaterThan(0);
      const box = await img.boundingBox();
      expect(box?.width).toBe(
        (await img.getAttribute("src"))?.includes("brand.svg") ? 24 : 20,
      );
      expect(box?.height).toBe(box?.width);
    }
    const geometry = await page.evaluate(() =>
      Object.fromEntries(
        [
          ".sidebar",
          ".topbar",
          "main",
          ".page-heading",
          ".list-metrics",
          ".hq-filters",
          ".hq-records",
          ".revised-editor",
          ".document-pair",
          ".document-viewer",
          ".management-table",
        ].map((selector) => {
          const el = document.querySelector(selector),
            box = el?.getBoundingClientRect();
          return [
            selector,
            el && box
              ? {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: box.height,
                  font: getComputedStyle(el).fontFamily,
                }
              : null,
          ];
        }),
      ),
    );
    expect(geometry[".sidebar"]?.width).toBe(260);
    expect(geometry[".topbar"]?.height).toBe(80);
    if (name === "hq-list") {
      expect(geometry[".list-metrics"]?.y).toBe(202);
      expect(geometry[".hq-filters"]?.height).toBe(76);
      expect(geometry[".hq-records"]?.y).toBe(430);
    }
    if (name === "hq-documents") {
      expect(geometry[".document-viewer"]?.width).toBe(786);
      expect(geometry[".document-viewer"]?.height).toBe(790);
    }
    await info.attach(name + "-geometry.json", {
      body: JSON.stringify(geometry, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath(name + "-1920.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
    await page.screenshot({
      path: info.outputPath(name + "-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
});
