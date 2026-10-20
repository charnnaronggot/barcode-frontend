import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { Api } from "./api";
import { CONFIG } from "./config";
import { Barcode } from "./models";
import { INITIAL_SESSION_REQUEST } from "./login-failure";
describe("OpenAPI client workflow requests", () => {
  let api: Api, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CONFIG,
          useValue: {
            commandApi: "https://command.test",
            queryApi: "https://query.test",
            reportApi: "https://report.test",
          },
        },
      ],
    });
    api = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it("marks the initial session check so a login rejection is not treated as an expired live session", () => {
    api.session().subscribe();
    const req = http.expectOne("https://query.test/api/session");
    expect(req.request.context.get(INITIAL_SESSION_REQUEST)).toBe(true);
    req.flush({});
  });
  it("sends generation version and idempotency in multipart form, without revision fields", () => {
    api
      .generate({ id: 7, rowVersion: "AQID" } as Barcode, "same-key")
      .subscribe();
    const req = http.expectOne("https://report.test/api/barcodes/7/generate");
    expect(req.request.method).toBe("POST");
    expect(req.request.headers.get("Idempotency-Key")).toBe("same-key");
    const body = req.request.body as FormData;
    expect(body.has("newRevision")).toBe(false);
    expect(body.get("draftVersion")).toBe("AQID");
    expect(body.has("expectedRevisionId")).toBe(false);
    req.flush({});
  });
  it("uploads signed files against the current Barcode UUID", () => {
    const file = new File(["pdf"], "signed.pdf", { type: "application/pdf" });
    api.signed(7, file, "upload-key", "current-pdf-uuid").subscribe();
    const req = http.expectOne("https://command.test/api/barcodes/7/signed");
    expect((req.request.body as FormData).get("generatedFileUuid")).toBe(
      "current-pdf-uuid",
    );
    expect(req.request.headers.get("Idempotency-Key")).toBe("upload-key");
    req.flush({});
  });
  it("keeps column mapping and sheet identical between preview and commit", () => {
    const file = new File(["csv"], "data.csv");
    const mapping = { branch_id: 2, ref_1: 0 };
    api.preview(file, mapping, 1).subscribe();
    api.commitImport(file, mapping, 1, "import-key").subscribe();
    for (const route of [
      "/api/barcodes/import/preview",
      "/api/barcodes/import",
    ]) {
      const req = http.expectOne("https://command.test" + route);
      expect(req.request.body.get("mapping")).toBe(JSON.stringify(mapping));
      expect(req.request.body.get("sheet")).toBe("1");
      req.flush({});
    }
  });
  it("loads record data through Query rather than a write or report host", () => {
    api.get(7).subscribe();
    const req = http.expectOne("https://query.test/api/barcodes/7");
    expect(req.request.method).toBe("GET");
    req.flush({});
  });
});
