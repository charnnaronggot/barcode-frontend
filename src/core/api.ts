import { endpoints as command } from "./generated/command/endpoints";
import { endpoints as query } from "./generated/query/endpoints";
import { endpoints as report } from "./generated/report/endpoints";

import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpContext, HttpParams } from "@angular/common/http";
import { INITIAL_SESSION_REQUEST } from "./login-failure";
import { CONFIG } from "./config";
import {
  Audit,
  Barcode,
  BarcodeInput,
  Branch,
  BulkProgress,
  ImportPreview,
  Mutation,
  Session,
  Summary,
} from "./models";
const routes = { command, query, report };
@Injectable({ providedIn: "root" })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CONFIG);
  private endpoint<T extends keyof typeof routes>(
    host: T,
    operation: keyof (typeof routes)[T],
    values: Record<string, string | number> = {},
  ) {
    let path = (routes[host] as Record<string, string>)[operation as string];
    for (const [key, value] of Object.entries(values))
      path = path.replace("{" + key + "}", encodeURIComponent(String(value)));
    return (
      this.config[
        (host + "Api") as "commandApi" | "queryApi" | "reportApi"
      ].replace(/\/$/, "") + path
    );
  }
  session() {
    return this.http.get<Session>(this.endpoint("query", "GET /api/session"), {
      context: new HttpContext().set(INITIAL_SESSION_REQUEST, true),
    });
  }
  summary() {
    return this.http.get<Summary>(
      this.endpoint("query", "GET /api/barcodes/summary"),
    );
  }
  branches() {
    return this.http.get<Branch[]>(this.endpoint("query", "GET /api/branches"));
  }
  saveBranch(id: number, name: string, isActive: boolean, key: string) {
    return this.http.put<Branch>(
      this.endpoint("command", "PUT /api/branches/{id}", { id }),
      { name, isActive },
      { headers: { "Idempotency-Key": key } },
    );
  }
  list(query: Record<string, string | number>) {
    return this.http.get<Barcode[]>(
      this.endpoint("query", "GET /api/barcodes"),
      { params: new HttpParams({ fromObject: query }), observe: "response" },
    );
  }
  get(id: number) {
    return this.http.get<Barcode>(
      this.endpoint("query", "GET /api/barcodes/{id}", { id }),
    );
  }
  create(data: BarcodeInput, key: string) {
    return this.http.post<Mutation>(
      this.endpoint("command", "POST /api/barcodes"),
      data,
      { headers: { "Idempotency-Key": key } },
    );
  }
  update(id: number, data: BarcodeInput, rowVersion: string, key: string) {
    return this.http.put<Mutation>(
      this.endpoint("command", "PUT /api/barcodes/{id}", { id }),
      { data, rowVersion },
      { headers: { "Idempotency-Key": key } },
    );
  }
  generate(row: Barcode, key: string) {
    const form = new FormData();
    form.set("draftVersion", row.rowVersion);
    return this.http.post<Mutation>(
      this.endpoint("report", "POST /api/barcodes/{id}/generate", {
        id: row.id,
      }),
      form,
      { headers: { "Idempotency-Key": key } },
    );
  }
  startGeneration(ids: number[] | undefined, key: string) {
    return this.http.post<BulkProgress>(
      this.endpoint("report", "POST /api/barcodes/generation-jobs"),
      { ids },
      { headers: { "Idempotency-Key": key } },
    );
  }
  generationJob(id: string) {
    return this.http.get<BulkProgress>(
      this.endpoint("report", "GET /api/barcodes/generation-jobs/{id}", { id }),
    );
  }
  retryGeneration(id: string) {
    return this.http.post<BulkProgress>(
      this.endpoint("report", "POST /api/barcodes/generation-jobs/{id}/retry", {
        id,
      }),
      {},
    );
  }
  signed(id: number, file: File, key: string, generatedFileUuid?: string) {
    const form = new FormData();
    form.set("file", file);
    if (generatedFileUuid) form.set("generatedFileUuid", generatedFileUuid);
    return this.http.post<Mutation>(
      this.endpoint("command", "POST /api/barcodes/{id}/signed", { id }),
      form,
      { headers: { "Idempotency-Key": key } },
    );
  }
  preview(file: File, mapping?: Record<string, number>, sheet = 0) {
    return this.http.post<ImportPreview>(
      this.endpoint("command", "POST /api/barcodes/import/preview"),
      this.importForm(file, mapping, sheet),
    );
  }
  commitImport(
    file: File,
    mapping: Record<string, number>,
    sheet: number,
    key: string,
  ) {
    return this.http.post<Mutation>(
      this.endpoint("command", "POST /api/barcodes/import"),
      this.importForm(file, mapping, sheet),
      { headers: { "Idempotency-Key": key } },
    );
  }
  file(uuid: string) {
    return this.http.get(
      this.endpoint("report", "GET /api/files/{uuid}", { uuid }),
      { responseType: "blob" },
    );
  }
  audit(query: Record<string, string | number> = {}) {
    return this.http.get<Audit[]>(
      this.endpoint("query", "GET /api/audit-logs"),
      { params: query, observe: "response" },
    );
  }
  private importForm(file: File, mapping?: Record<string, number>, sheet = 0) {
    const data = new FormData();
    data.set("file", file);
    data.set("sheet", String(sheet));
    if (mapping) data.set("mapping", JSON.stringify(mapping));
    return data;
  }
}
