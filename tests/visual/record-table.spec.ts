import { test, expect } from "@playwright/test";
import { fixture, original, generated } from "./fixtures";
for (const role of ["hq", "branch"]) {
  test(`${role} long document names wrap within their cells and viewing actions are not duplicated`, async ({
    page,
  }, info) => {
    const data = await fixture(page);
    const title =
      "ศูนย์ไปรษณีย์พระนครศรีอยุธยา (เคาน์เตอร์บริการไปรษณีย์ไทย) " +
      "ชื่อยาวมากไม่มีช่องว่าง".repeat(12);
    data.update({
      ...original,
      textLevel1: title,
      branchName: "สาขาพระนครศรีอยุธยาชื่อสาขายาวสำหรับทดสอบ",
      hasSignedFile: true,
      files: [
        generated,
        { ...generated, fileType: "signed", uuid: "signed-current" },
      ],
    });
    await page.goto("/barcodes" + (role === "hq" ? "?role=hq" : ""));
    await expect(
      page.getByRole("link", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".row-actions a")).toHaveCount(1);
    await expect(
      page.getByRole("link", {
        name: role === "hq" ? "ดูเอกสาร / แนบใบลายมือชื่อ" : "ดูเอกสาร",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "วันที่สร้าง", exact: true }),
    ).toHaveCount(0);
    if (role === "hq")
      await expect(page.getByRole("columnheader")).toHaveCount(6);
    await expect(
      page.getByRole("link", { name: "ดูใบลายมือชื่อ", exact: true }),
    ).toHaveCount(0);
    for (const width of [1920, 1366, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
      const cells = await page
        .locator(".documents tbody tr:first-child td")
        .evaluateAll((elements) =>
          elements.map((el) => ({
            width: el.clientWidth,
            content: el.scrollWidth,
          })),
        );
      for (const cell of cells)
        expect(cell.content).toBeLessThanOrEqual(cell.width + 1);
      const link = await page
        .getByRole("link", { name: title, exact: true })
        .boundingBox();
      const cell = await page
        .locator(".documents tbody tr:first-child td:first-child")
        .boundingBox();
      expect(link!.x + link!.width).toBeLessThanOrEqual(
        cell!.x + cell!.width + 1,
      );
      await page.screenshot({
        path: info.outputPath(`${role}-long-name-${width}.png`),
        fullPage: true,
      });
    }
  });
}
