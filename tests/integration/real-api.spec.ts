import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const states = [
  process.env["BARCODE_HQ_STATE"],
  process.env["BARCODE_BRANCH_STATE"],
  process.env["BARCODE_OTHER_BRANCH_STATE"],
];
const webUrl = process.env["BARCODE_WEB_URL"];
const requireHqOrgLevel =
  process.env["BARCODE_E2E_REQUIRE_HQ_ORG_LEVEL"] !== "false";
async function open(browser: Browser, file: string) {
  const { sessionStorage, ...state } = JSON.parse(
    await fs.readFile(file, "utf8"),
  );
  const context = await browser.newContext({
    baseURL: webUrl,
    storageState: state,
  });
  if (sessionStorage)
    await context.addInitScript(
      (saved: { origin: string; values: Record<string, string> }) => {
        if (location.origin === saved.origin)
          for (const [key, value] of Object.entries(saved.values))
            window.sessionStorage.setItem(key, value);
      },
      sessionStorage,
    );
  return context;
}
async function session(context: BrowserContext) {
  const page = await context.newPage();
  const responsePromise = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith("/api/session"),
    { timeout: 60000 },
  );
  await page.goto("/barcodes");
  const response = await responsePromise;
  expect(
    response.status(),
    "Real API must accept the provisioned access token",
  ).toBe(200);
  return {
    page,
    value: await response.json(),
    authorization: response.request().headers()["authorization"],
  };
}
test.describe("provisioned Keycloak and real SQL/API", () => {
  test.skip(
    !webUrl || states.some((s) => !s),
    "Requires BARCODE_WEB_URL and private HQ/two-branch auth states. No authentication bypass.",
  );
  test("three real sessions follow the configured HQ access restriction", async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const contexts = await Promise.all(states.map((s) => open(browser, s!)));
    try {
      const [hq, branch, other] = await Promise.all(
        contexts.map((c) => session(c)),
      );
      expect(hq.value.isHq).toBe(true);
      expect(hq.value.capabilities.uploadSigned).toBe(true);
      for (const item of [branch, other]) {
        expect(item.value.isHq).toBe(!requireHqOrgLevel);
        expect(item.value.capabilities.uploadSigned).toBe(!requireHqOrgLevel);
        await expect(item.page.locator("input[type=file]")).toHaveCount(0);
      }
      expect(branch.value.branchId).not.toBe(other.value.branchId);
      const config = await (
        await branch.page.request.get("/config.json")
      ).json();
      const denied = await contexts[1].request.get(
        config.queryApi + "/api/barcodes?branchId=" + other.value.branchId,
        { headers: { Authorization: branch.authorization } },
      );
      expect(denied.status()).toBe(requireHqOrgLevel ? 403 : 200);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
  test("creates and signs a Barcode with the configured employee access", async ({
    browser,
  }, info) => {
    const fixture = process.env["BARCODE_SIGNED_FIXTURE"],
      branchId = Number(process.env["BARCODE_BRANCH_ID"]);
    test.skip(
      process.env["BARCODE_E2E_ALLOW_WRITE"] !== "1" || !fixture || !branchId,
      "Explicit write opt-in, verified branch ID and approved signed fixture are required before creating test data.",
    );
    test.setTimeout(300000);
    const contexts = await Promise.all(states.map((s) => open(browser, s!)));
    try {
      const [hq, branch, other] = await Promise.all(
        contexts.map((c) => session(c)),
      );
      expect(hq.value.capabilities.create).toBe(true);
      expect(branch.value.branchId).toBe(branchId);
      expect(other.value.branchId).not.toBe(branchId);
      const config = await (await hq.page.request.get("/config.json")).json();
      await fs.access(fixture!);
      await hq.page.goto("/barcodes/new");
      await expect(
        hq.page.getByRole("heading", { name: "สร้างรายการ Barcode" }),
      ).toBeVisible();
      const select = hq.page.getByRole("combobox", {
        name: "สาขาเจ้าของรายการ *",
        exact: true,
      });
      await select.click();
      await hq.page
        .getByPlaceholder("ค้นหารหัสหรือชื่อสาขา")
        .fill(String(branchId));
      const option = hq.page
        .getByRole("option")
        .filter({ hasText: new RegExp("\\(" + branchId + "\\)$") });
      await expect(
        option,
        "Verified branch must exist in DataHub and be active",
      ).toHaveCount(1);
      await expect(option).not.toHaveAttribute("data-p-disabled", "true");
      await option.click();
      await hq.page.getByLabel("เลขประจำตัวผู้เสียภาษี").fill("0012345678901");
      await hq.page.getByLabel("Suffix").fill("00");
      await hq.page
        .getByLabel("เลขอ้างอิง 1")
        .fill(("00" + Date.now()).slice(-15));
      for (const [label, text] of [
        ["ข้อความบรรทัดที่ 1", "ทดสอบการเชื่อมจริง"],
        ["ข้อความบรรทัดที่ 2", "ข้อมูลทดสอบที่ได้รับอนุญาต"],
        ["ข้อความบรรทัดที่ 3", "โครงการ ปณ."],
      ])
        await hq.page.getByLabel(label).fill(text);
      await hq.page.locator("input[type=file]").setInputFiles(fixture!);
      await hq.page.getByRole("button", { name: "ตรวจสอบข้อมูล" }).click();
      await expect(hq.page.getByRole("dialog")).toBeVisible();
      await hq.page
        .getByRole("button", { name: "บันทึกและสร้าง Barcode", exact: true })
        .click();
      await expect(hq.page).toHaveURL(/\/barcodes\/\d+\/document$/, {
        timeout: 180000,
      });
      await expect(
        hq.page.locator(
          ".document-pair iframe,.document-pair img.document-image",
        ),
      ).toHaveCount(2);
      const id = new URL(hq.page.url()).pathname.split("/")[2];
      const response = await contexts[0].request.get(
        config.queryApi + "/api/barcodes/" + id,
        { headers: { Authorization: hq.authorization } },
      );
      expect(response.status()).toBe(200);
      const row = await response.json();
      expect(row.hasSignedFile).toBe(true);
      await branch.page.goto("/barcodes/" + id + "/document");
      await expect(
        branch.page.locator(
          ".document-pair iframe,.document-pair img.document-image",
        ),
      ).toHaveCount(2);
      await expect(branch.page.locator("input[type=file]")).toHaveCount(
        requireHqOrgLevel ? 0 : 1,
      );
      const bytes = await fs.readFile(fixture!);
      for (const item of [
        { context: contexts[1], auth: branch.authorization },
        { context: contexts[2], auth: other.authorization },
      ]) {
        const denied = await item.context.request.post(
          config.commandApi + "/api/barcodes/" + id + "/signed",
          {
            headers: {
              Authorization: item.auth,
              "Idempotency-Key": crypto.randomUUID(),
            },
            multipart: requireHqOrgLevel
              ? {
                  file: {
                    name: path.basename(fixture!),
                    mimeType: "application/octet-stream",
                    buffer: bytes,
                  },
                }
              : {},
          },
        );
        expect(denied.status()).toBe(requireHqOrgLevel ? 403 : 400);
      }
      for (const file of row.files.filter(
        (f: { isActive: boolean }) => f.isActive,
      )) {
        const denied = await contexts[2].request.get(
          config.reportApi + "/api/files/" + file.uuid,
          { headers: { Authorization: other.authorization } },
        );
        expect(denied.status()).toBe(requireHqOrgLevel ? 403 : 200);
      }
      await other.page.goto("/barcodes/" + id + "/document");
      if (requireHqOrgLevel)
        await expect(other.page.getByRole("status")).toContainText(
          "ไม่มีสิทธิ์",
        );
      else
        await expect(
          other.page.locator(
            ".document-pair iframe,.document-pair img.document-image",
          ),
        ).toHaveCount(2);
      await hq.page.screenshot({
        path: info.outputPath("hq-real-documents.png"),
        fullPage: true,
      });
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
});
