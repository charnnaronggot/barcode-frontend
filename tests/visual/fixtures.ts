import { Page } from "@playwright/test";
import type { Barcode, DocumentFile } from "../../src/core/models";
export const generated: DocumentFile = {
  uuid: "00000000-0000-0000-0000-000000000001",
  fileType: "generated",
  isActive: true,
  contentType: "application/pdf",
  originalName: null,
  createdUtc: "2026-10-12T10:00:00Z",
  actorIssuer: "https://identity.test/realms/internal",
  actorSubject: "hq-user",
};
export const original: Barcode = {
  id: 1001,
  branchId: 101,
  branchName: "สาขากรุงเทพ",
  comp: "POST",
  tax: "0012345678901",
  suffix: "00",
  ref1: "0000123456",
  ref2: "00001",
  ref3: null,
  textLevel1: "ที่ทำการไปรษณีย์กรุงเทพ",
  textLevel2: "กรุงเทพ",
  textLevel3: "โครงการ ปณ.",
  amount: null,
  rowVersion: "AQIDBAUGBwg=",
  updatedUtc: "2026-10-12T10:00:00Z",
  hasGeneratedPdf: true,
  hasSignedFile: false,
  status: "unsigned",
  files: [generated],
};
export function realPdf() {
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>",
    "<< /Length 0 >>\nstream\n\nendstream",
  ];
  objects.forEach((value, i) => {
    offsets.push(Buffer.byteLength(parts.join("")));
    parts.push(i + 1 + " 0 obj\n" + value + "\nendobj\n");
  });
  const start = Buffer.byteLength(parts.join(""));
  parts.push(
    "xref\n0 5\n0000000000 65535 f \n" +
      offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join("") +
      "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n" +
      start +
      "\n%%EOF",
  );
  return Buffer.from(parts.join(""));
}
export async function fixture(page: Page) {
  let row = structuredClone(original);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/(command|query|report)(?=\/)/, "");
    const headers = {
      "X-Total-Count": "1",
      "Content-Type": "application/json",
    };
    if (p.startsWith("/api/files/"))
      return route.fulfill({ contentType: "application/pdf", body: realPdf() });
    let body: unknown = [];
    if (p === "/api/branches")
      body = [
        { id: 101, name: "สาขากรุงเทพ", isActive: true, count: 1 },
        { id: 202, name: "สาขาเชียงใหม่", isActive: true, count: 0 },
      ];
    else if (p === "/api/barcodes/summary")
      body = { total: 1, generated: 1, signed: 0, unsigned: 1 };
    else if (p === "/api/barcodes/1001") body = row;
    else if (p === "/api/barcodes") body = [row];
    else if (p === "/api/barcodes/import/preview")
      body = {
        sheets: ["ข้อมูล"],
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
        sample: [
          [
            "101",
            "POST",
            "0012345678901",
            "00",
            "00001",
            "หนึ่ง",
            "สอง",
            "สาม",
          ],
        ],
        count: 1,
        errors: [],
      };
    else if (p === "/api/barcodes/import") body = { count: 1, ids: [1002] };
    await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
  return {
    update: (next: typeof original) => {
      row = next;
    },
  };
}
