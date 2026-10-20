import { test, expect } from "@playwright/test";
import { fixture } from "./fixtures";

test("owner branch supports Thai name and code search and an empty result", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/barcodes/new?role=hq");
  const picker = page.getByRole("combobox", {
    name: "สาขาเจ้าของรายการ *",
    exact: true,
  });
  await picker.click();
  const search = page.getByPlaceholder("ค้นหารหัสหรือชื่อสาขา");
  await search.fill("เชียง");
  await expect(
    page.getByRole("option", { name: "สาขาเชียงใหม่ (202)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "สาขากรุงเทพ (101)", exact: true }),
  ).toHaveCount(0);
  await search.fill("ไม่มีสาขานี้");
  await expect(page.getByText("ไม่พบสาขา", { exact: true })).toBeVisible();
  await search.fill("202");
  await page.screenshot({
    path: info.outputPath("branch-code-search.png"),
    fullPage: true,
  });
  await page
    .getByRole("option", { name: "สาขาเชียงใหม่ (202)", exact: true })
    .click();
  await expect(picker).toContainText("สาขาเชียงใหม่ (202)");
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.click();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: info.outputPath("branch-search-mobile.png"),
    fullPage: true,
  });
});

test("list branch search sends selected numeric id and clear removes the filter", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/barcodes?role=hq");
  const picker = page.getByRole("combobox", { name: "สาขา", exact: true });
  await picker.click();
  await page.getByPlaceholder("ค้นหารหัสหรือชื่อสาขา").fill("202");
  const selected = page.waitForRequest(
    (r) =>
      new URL(r.url()).pathname.endsWith("/api/barcodes") &&
      new URL(r.url()).searchParams.get("branchId") === "202",
  );
  await page
    .getByRole("option", { name: "สาขาเชียงใหม่ (202)", exact: true })
    .click();
  await selected;
  const cleared = page.waitForRequest(
    (r) =>
      new URL(r.url()).pathname.endsWith("/api/barcodes") &&
      !new URL(r.url()).searchParams.has("branchId"),
  );
  await page.locator('p-select[name="branch"] .p-select-clear-icon').click();
  await cleared;
});

test("inactive branch is disabled and generated records keep their owner locked", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/branches", (route) =>
    route.fulfill({
      json: [
        { id: 101, name: "สาขากรุงเทพ", isActive: true, count: 1 },
        { id: 202, name: "สาขาปิด", isActive: false, count: 0 },
      ],
    }),
  );
  await page.goto("/barcodes/new?role=hq");
  await page
    .getByRole("combobox", { name: "สาขาเจ้าของรายการ *", exact: true })
    .click();
  const inactive = page.getByRole("option", {
    name: "สาขาปิด (202) (ปิดใช้งาน)",
    exact: true,
  });
  await expect(inactive).toHaveAttribute("data-p-disabled", "true");
  await inactive.click({ force: true });
  await expect(
    page.getByRole("combobox", { name: "สาขาเจ้าของรายการ *", exact: true }),
  ).toContainText("เลือกสาขา");
  await page.goto("/barcodes/1001/edit?role=hq");
  await expect(
    page.getByRole("combobox", { name: "สาขาเจ้าของรายการ *", exact: true }),
  ).toBeDisabled();
});
