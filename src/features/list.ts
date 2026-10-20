import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { DatePipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { Barcode, Branch, Summary } from "../core/models";
import { Feedback } from "../shared/feedback";
import { BulkGeneration } from "../core/bulk-generation";

@Component({
  imports: [FormsModule, RouterLink, ButtonModule, SelectModule, DatePipe],
  template: ` <div
      class="page-heading"
      [class.hq-list-heading]="auth.session()?.isHq"
    >
      <div>
        <h1>
          {{
            auth.session()?.isHq
              ? "รายการ Barcode"
              : "เอกสารของ " + auth.session()?.branchName
          }}
        </h1>
        <p class="muted">
          {{
            auth.session()?.isHq
              ? "จัดการใบ Barcode และใบลายมือชื่อของทุกสาขาในโครงการ ปณ."
              : "ดูใบ Barcode และใบลายมือชื่อที่สำนักงานใหญ่อัปโหลด"
          }}
        </p>
      </div>
      @if (auth.session()?.capabilities?.create) {
        <div class="actions">
          @if (auth.session()?.capabilities?.generate) {
            <p-button
              label="สร้าง Barcode ทั้งหมด"
              severity="secondary"
              [disabled]="
                bulk.busy() ||
                bulk.job()?.status === 'running' ||
                bulk.job()?.status === 'queued'
              "
              (onClick)="bulk.start()"
            />
          }
          <a routerLink="/import" class="button secondary">นำเข้า Excel / CSV</a
          ><a routerLink="/barcodes/new" class="button">+ สร้างรายการ</a>
        </div>
      }
    </div>
    @if (auth.session()?.isHq) {
      <div class="metrics list-metrics">
        @for (metric of metrics(); track metric.label) {
          <section class="card metric">
            <span class="muted">{{ metric.label }}</span
            ><strong [style.color]="metric.color">{{ metric.value }}</strong
            ><small>{{ metric.caption }}</small>
          </section>
        }
      </div>
    }
    <section class="card filter-card" [class.hq-filters]="auth.session()?.isHq">
      <form class="filters" (ngSubmit)="searchPage()">
        <label class="search-field">
          @if (!auth.session()?.isHq) {
            ค้นหา
          }
          <input
            name="search"
            aria-label="ค้นหารายการ Barcode"
            [(ngModel)]="search"
            placeholder="ค้นหาข้อความบรรทัดที่ 1"
        /></label>
        @if (auth.session()?.isHq) {
          <label for="filter-branch"
            ><span class="sr-only">สาขา</span
            ><p-select
              inputId="filter-branch"
              ariaLabel="สาขา"
              name="branch"
              [(ngModel)]="branch"
              (ngModelChange)="searchPage()"
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="id"
              [filter]="true"
              filterBy="label"
              [showClear]="true"
              filterPlaceholder="ค้นหารหัสหรือชื่อสาขา"
              placeholder="ทุกสาขา"
              emptyFilterMessage="ไม่พบสาขา"
              emptyMessage="ไม่มีข้อมูลสาขา"
              appendTo="body"
          /></label>
          <label for="barcode-status"
            ><span class="sr-only">สถานะ Barcode</span
            ><p-select
              inputId="barcode-status"
              ariaLabel="สถานะ Barcode"
              name="barcodeStatus"
              [(ngModel)]="barcodeStatus"
              (ngModelChange)="searchPage()"
              [options]="barcodeStatuses"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
          /></label>
          <label for="signature-status"
            ><span class="sr-only">ใบลายมือชื่อ</span
            ><p-select
              inputId="signature-status"
              ariaLabel="ใบลายมือชื่อ"
              name="signatureStatus"
              [(ngModel)]="signatureStatus"
              (ngModelChange)="searchPage()"
              [options]="signatureStatuses"
              optionLabel="label"
              optionValue="value"
              appendTo="body" /></label
          ><button
            type="button"
            class="text-link clear-filters"
            (click)="clearFilters()"
          >
            ล้างตัวกรอง
          </button>
        } @else {
          <label for="branch-status"
            >สถานะ<p-select
              inputId="branch-status"
              ariaLabel="สถานะ"
              name="status"
              [(ngModel)]="status"
              [options]="branchStatuses"
              optionLabel="label"
              optionValue="value"
              appendTo="body" /></label
          ><p-button type="submit" label="ค้นหา" [loading]="loading()" />
        }
      </form>
    </section>
    @if (!auth.session()?.isHq) {
      <div class="branch-banner">
        <strong>รายการของสาขา</strong
        ><small
          >มี {{ total() }} รายการ • กดดู Barcode
          เพื่อเปิดเอกสารและใบลายมือชื่อคู่กัน</small
        >
      </div>
    }
    <section class="card record-card" [class.hq-records]="auth.session()?.isHq">
      @if (auth.session()?.isHq) {
        <div class="table-title">
          <strong
            >รายการล่าสุด
            <span class="muted">{{ total() }} รายการ</span></strong
          ><span class="muted">เฉพาะโครงการ ปณ. • ทุกสาขา</span>
        </div>
      }
      <div class="table-scroll">
        <table
          class="documents"
          [class.branch-documents]="!auth.session()?.isHq"
        >
          <colgroup>
            <col class="record-name-column" />
            @if (auth.session()?.isHq) {
              <col class="record-branch-column" />
              <col class="record-status-column" />
            }
            <col class="record-signature-column" />
            @if (auth.session()?.isHq) {
              <col class="record-updated-column" />
            }
            <col class="record-actions-column" />
          </colgroup>
          <thead>
            <tr>
              <th>ใบ Barcode</th>
              @if (auth.session()?.isHq) {
                <th>สาขาเจ้าของข้อมูล</th>
                <th>สถานะ Barcode</th>
              }
              <th>ใบลายมือชื่อ</th>
              @if (auth.session()?.isHq) {
                <th>อัปเดตล่าสุด</th>
              }
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td [attr.colspan]="auth.session()?.isHq ? 6 : 3" class="empty">
                  กำลังโหลดรายการ…
                </td>
              </tr>
            } @else {
              @for (row of rows(); track row.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/barcodes', row.id, 'document']"
                      ><strong>{{ row.textLevel1 || "—" }}</strong></a
                    >
                    @if (!auth.session()?.isHq) {
                      <small>{{ row.updatedUtc | date: "dd MMM yyyy" }}</small>
                    }
                  </td>
                  @if (auth.session()?.isHq) {
                    <td>{{ row.branchName }}</td>
                    <td>
                      <span
                        [class]="
                          row.hasGeneratedPdf
                            ? 'badge generated'
                            : 'badge draft'
                        "
                        >{{
                          row.hasGeneratedPdf ? "สร้างแล้ว" : "ยังไม่สร้าง"
                        }}</span
                      >
                    </td>
                  }
                  <td>
                    <span
                      [class]="
                        row.hasSignedFile
                          ? 'signature-state signed'
                          : 'signature-state unsigned'
                      "
                      >{{
                        row.hasSignedFile
                          ? "อัปโหลดแล้ว • " + signedType(row)
                          : "ยังไม่ได้อัปโหลด"
                      }}</span
                    >
                  </td>
                  @if (auth.session()?.isHq) {
                    <td>{{ row.updatedUtc | date: "dd/MM/yyyy HH:mm" }}</td>
                  }
                  <td class="row-actions">
                    <div class="record-actions">
                      @if (auth.session()?.isHq) {
                        <a
                          [routerLink]="['/barcodes', row.id, 'document']"
                          [fragment]="
                            row.hasGeneratedPdf ? 'signature' : undefined
                          "
                          class="button subtle"
                          >ดูเอกสาร / แนบใบลายมือชื่อ</a
                        >
                      } @else {
                        <a
                          [routerLink]="['/barcodes', row.id, 'document']"
                          class="button secondary"
                          >ดูเอกสาร</a
                        >
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td
                    [attr.colspan]="auth.session()?.isHq ? 6 : 3"
                    class="empty"
                  >
                    ไม่พบรายการที่ตรงกับการค้นหา
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      @if (auth.session()?.isHq || total() > 20) {
        <div class="pagination">
          <span
            >แสดง {{ total() ? (page() - 1) * 20 + 1 : 0 }}–{{
              (page() - 1) * 20 + rows().length
            }}
            จาก {{ total() }} รายการ</span
          >
          <div class="actions">
            <p-button
              label="ก่อนหน้า"
              severity="secondary"
              [disabled]="page() === 1 || loading()"
              (onClick)="changePage(-1)"
            /><span class="page-number">{{ page() }}</span
            ><p-button
              label="ถัดไป"
              severity="secondary"
              [disabled]="page() * 20 >= total() || loading()"
              (onClick)="changePage(1)"
            />
          </div>
        </div>
      }
    </section>
    @if (auth.session()?.capabilities?.audit) {
      <a routerLink="/history" class="text-link history-link"
        >ประวัติการทำงาน</a
      >
    }`,
})
export class List implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly bulk = inject(BulkGeneration);
  readonly api = inject(Api);
  readonly auth = inject(Auth);
  readonly feedback = inject(Feedback);
  private readonly route = inject(ActivatedRoute);
  readonly signedMode = !!this.route.snapshot.data["signed"];
  readonly rows = signal<Barcode[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly branchOptions = computed(() =>
    this.branches().map((b) => ({
      ...b,
      label: `${b.name || "สาขา"} (${b.id})`,
    })),
  );
  readonly barcodeStatuses = [
    { label: "สถานะ Barcode ทั้งหมด", value: "" },
    { label: "สร้าง Barcode แล้ว", value: "generated" },
    { label: "ยังไม่สร้าง Barcode", value: "draft" },
  ];
  readonly signatureStatuses = [
    { label: "ใบลายมือชื่อทั้งหมด", value: "" },
    { label: "แนบแล้ว", value: "signed" },
    { label: "ยังไม่ได้แนบ", value: "unsigned" },
  ];
  readonly branchStatuses = [
    { label: "ทั้งหมด", value: "" },
    { label: "ยังไม่สร้าง Barcode", value: "draft" },
    { label: "ยังไม่มีใบลายมือชื่อ", value: "unsigned" },
    { label: "แนบใบลายมือชื่อแล้ว", value: "signed" },
  ];
  search = "";
  status =
    this.route.snapshot.queryParamMap.get("status") ||
    (this.signedMode ? "signed" : "");
  branch: number | null =
    Number(this.route.snapshot.queryParamMap.get("branchId")) || null;
  readonly summary = signal<Summary | null>(null);
  barcodeStatus = "";
  signatureStatus = "";
  private request?: Subscription;
  constructor() {
    const refresh = () => {
      this.load();
      if (this.auth.session()?.isHq)
        this.api
          .summary()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (s) => this.summary.set(s),
            error: (e) => this.feedback.error(e),
          });
    };
    window.addEventListener("barcode-generation-completed", refresh);
    this.destroyRef.onDestroy(() =>
      window.removeEventListener("barcode-generation-completed", refresh),
    );
  }
  metrics() {
    const s = this.summary();
    return [
      {
        label: "รายการทั้งหมด",
        value: s?.total ?? "—",
        caption: "ในโครงการ ปณ.",
        color: "var(--ink)",
      },
      {
        label: "สร้าง Barcode แล้ว",
        value: s?.generated ?? "—",
        caption: "พร้อมเปิดดูและดาวน์โหลด",
        color: "var(--brand)",
      },
      {
        label: "แนบใบลายมือชื่อแล้ว",
        value: s?.signed ?? "—",
        caption: "ผูกกับใบ Barcode ที่สร้างแล้ว",
        color: "var(--green)",
      },
      {
        label: "ยังไม่มีใบลายมือชื่อ",
        value: s?.unsigned ?? "—",
        caption: "จากใบที่สร้าง Barcode แล้ว",
        color: "var(--amber)",
      },
    ];
  }
  signedType(row: Barcode) {
    const file = row.files.find((f) => f.fileType === "signed" && f.isActive);
    return file?.contentType === "image/png"
      ? "PNG"
      : file?.contentType === "image/jpeg"
        ? "JPEG"
        : "PDF";
  }
  clearFilters() {
    this.search = "";
    this.status = "";
    this.branch = null;
    this.barcodeStatus = "";
    this.signatureStatus = "";
    this.searchPage();
  }
  ngOnInit() {
    if (this.auth.session()?.isHq)
      this.api
        .summary()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (s) => this.summary.set(s),
          error: (e) => this.feedback.error(e),
        });
    this.api
      .branches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => this.branches.set(b),
        error: (e) => this.feedback.error(e),
      });
    this.load();
  }
  searchPage() {
    this.page.set(1);
    this.load();
  }
  changePage(delta: number) {
    this.page.update((p) => p + delta);
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.request = this.api
      .list({
        page: this.page(),
        pageSize: 20,
        search: this.search,
        status: this.status,
        barcodeStatus: this.barcodeStatus,
        signatureStatus: this.signatureStatus,
        ...(this.branch ? { branchId: this.branch } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.rows.set(response.body || []);
          this.total.set(Number(response.headers.get("X-Total-Count")) || 0);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.feedback.error(error, () => this.load());
        },
      });
  }
}
