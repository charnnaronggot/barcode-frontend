import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Component, inject, OnInit, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { Api } from "../core/api";
import { Audit, Branch, Summary } from "../core/models";
import { Feedback } from "../shared/feedback";
@Component({
  imports: [RouterLink, DatePipe],
  template: `<div class="page-heading">
      <div>
        <h1>ภาพรวมโครงการ ปณ.</h1>
        <p class="muted">ติดตามรายการ Barcode และสถานะใบลายมือชื่อ</p>
      </div>
      <div class="actions">
        <a routerLink="/import" class="button secondary">นำเข้าข้อมูล</a
        ><a routerLink="/barcodes/new" class="button">+ สร้างรายการใหม่</a>
      </div>
    </div>
    <div class="metrics">
      @for (metric of metrics(); track metric.label) {
        <a
          [routerLink]="['/barcodes']"
          [queryParams]="{ status: metric.status }"
          class="card metric"
          ><span class="muted">{{ metric.label }}</span
          ><strong>{{ metric.value }}</strong
          ><small>รายการ</small></a
        >
      }
    </div>
    <section class="card detail-card">
      <div class="section-heading">
        <h2>รายการที่ต้องดำเนินการ</h2>
        <a routerLink="/barcodes">ดูรายการทั้งหมด →</a>
      </div>
      <div class="action-grid">
        <a routerLink="/barcodes" [queryParams]="{ status: 'draft' }"
          ><strong>รายการรอสร้าง Barcode</strong>
          <p class="muted">ตรวจสอบข้อมูลแบบร่างและสร้างเอกสาร</p></a
        ><a routerLink="/barcodes" [queryParams]="{ status: 'unsigned' }"
          ><strong>ติดตามใบลายมือชื่อ</strong>
          <p class="muted">ตรวจสอบรายการที่สาขายังไม่แนบใบเซ็น</p></a
        >
      </div>
    </section>
    <section class="card detail-card">
      <div class="section-heading">
        <h2>กิจกรรมล่าสุด</h2>
        <a routerLink="/history">ดูประวัติทั้งหมด →</a>
      </div>
      @for (item of audit(); track item.id) {
        <div class="audit-row">
          <strong>{{ actionName(item.action) }}</strong
          ><span
            >รายการ {{ item.barcodeId || "—" }} · สาขา
            {{ item.branchId || "—" }}</span
          ><small class="muted">{{
            item.createdUtc | date: "dd/MM/yyyy HH:mm"
          }}</small>
        </div>
      } @empty {
        <p class="muted">ยังไม่มีกิจกรรม</p>
      }
    </section>`,
})
export class Overview implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  readonly summary = signal<Summary | null>(null);
  readonly audit = signal<Audit[]>([]);
  readonly actionName = actionName;
  metrics() {
    const s = this.summary();
    return [
      { label: "รายการทั้งหมด", value: s?.total ?? "—", status: "" },
      { label: "สร้าง Barcode แล้ว", value: s?.generated ?? "—", status: "" },
      { label: "รอแนบใบเซ็น", value: s?.unsigned ?? "—", status: "unsigned" },
      { label: "แนบใบเซ็นแล้ว", value: s?.signed ?? "—", status: "signed" },
    ];
  }
  ngOnInit() {
    this.api
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.summary.set(s),
        error: (e) => this.feedback.error(e),
      });
    this.api
      .audit({ page: 1, pageSize: 5 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.audit.set(r.body || []),
        error: (e) => this.feedback.error(e),
      });
  }
}
export function actionName(action: string) {
  return (
    (
      {
        create: "สร้างรายการ",
        import: "นำเข้าข้อมูล",
        "update-draft": "แก้ไขแบบร่าง",
        generate: "สร้าง Barcode",
        "upload-signed": "แนบใบลายมือชื่อ",
        "update-branch": "ปรับปรุงทะเบียนสาขา",
        download: "เปิดเอกสาร",
      } as Record<string, string>
    )[action] || action
  );
}
@Component({
  imports: [FormsModule, RouterLink, ButtonModule, SelectModule],
  template: ` <div class="page-heading">
      <div>
        <h1>
          {{
            editing
              ? "เพิ่มหรือแก้ไขสาขา"
              : detailId
                ? "รายละเอียดสาขา"
                : "จัดการสาขา"
          }}
        </h1>
        <p class="muted">ทุกสาขาในโครงการ ปณ.</p>
      </div>
    </div>
    @if (editing) {
      @if (edit(); as branch) {
        <section class="card organization-card">
          <h2>{{ branch.name || "สาขาใหม่" }}</h2>
          <form (ngSubmit)="save(branch)" class="organization-form">
            @if (detailId) {
              <label
                >รหัสสาขา<input
                  name="id"
                  type="number"
                  [ngModel]="branch.id"
                  disabled
              /></label>
            } @else {
              <label for="registry-branch"
                >เลือกสาขาจาก DataHub<p-select
                  inputId="registry-branch"
                  ariaLabel="เลือกสาขาจาก DataHub"
                  name="id"
                  [ngModel]="branch.id"
                  (ngModelChange)="selectBranch($event)"
                  [options]="referenceOptions()"
                  optionLabel="label"
                  optionValue="id"
                  [filter]="true"
                  filterBy="label"
                  filterPlaceholder="ค้นหารหัสหรือชื่อสาขา"
                  placeholder="เลือกสาขา"
                  [disabled]="busy()"
                  appendTo="body"
              /></label>
            }
            <label
              >ชื่อสาขา<input
                name="name"
                [ngModel]="branch.name"
                disabled /></label
            ><label
              >หน่วยงานเจ้าของข้อมูล<input
                value="โครงการ ปณ."
                disabled /></label
            ><label for="branch-active"
              >สถานะการใช้งาน<p-select
                inputId="branch-active"
                ariaLabel="สถานะการใช้งาน"
                name="active"
                [(ngModel)]="branch.isActive"
                [options]="activeOptions"
                optionLabel="label"
                optionValue="value"
                [disabled]="busy()"
                appendTo="body"
            /></label>
            <div class="actions">
              <p-button
                type="submit"
                label="บันทึกสาขา"
                [loading]="busy()"
                [disabled]="busy()"
              /><a
                routerLink="/branches"
                class="button secondary"
                [class.disabled]="busy()"
                >ยกเลิก</a
              >
            </div>
            <p class="muted">
              สาขาปิดใช้งานรับรายการใหม่ไม่ได้ แต่ยังเปิดเอกสารเดิมได้
            </p>
          </form>
        </section>
      }
    } @else if (detailId) {
      @if (detail(); as branch) {
        <section class="card organization-card">
          <h2>{{ branch.name }}</h2>
          <dl class="organization-data">
            <dt>รหัสสาขา</dt>
            <dd>{{ branch.id }}</dd>
            <dt>โครงการ</dt>
            <dd>โครงการ ปณ.</dd>
            <dt>ขอบเขตข้อมูล</dt>
            <dd>เฉพาะรายการและเอกสารของสาขา</dd>
            <dt>จำนวนรายการ</dt>
            <dd>{{ branch.count }} รายการ</dd>
            <dt>สถานะการใช้งาน</dt>
            <dd>{{ branch.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน" }}</dd>
          </dl>
          <p class="muted">
            สิทธิ์ผู้ใช้ตรวจสอบจากบัญชีพนักงานในระบบยืนยันตัวตน
          </p>
          <div class="actions">
            <a [routerLink]="['/branches', branch.id, 'edit']" class="button"
              >แก้ไขสาขา</a
            ><a
              routerLink="/barcodes"
              [queryParams]="{ branchId: branch.id }"
              class="button secondary"
              >ดูรายการ Barcode</a
            ><a routerLink="/branches" class="text-link">กลับรายการสาขา</a>
          </div>
        </section>
      } @else {
        <section class="card empty">
          {{ busy() ? "กำลังโหลด…" : "ไม่พบข้อมูลสาขา" }}
        </section>
      }
    } @else {
      <form class="management-toolbar" (ngSubmit)="applied = search">
        <label
          >ค้นหา<input
            name="search"
            [(ngModel)]="search"
            placeholder="ชื่อหรือรหัสสาขา" /></label
        ><p-button type="submit" label="ค้นหา" />
      </form>
      <section class="card management-table">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>รหัสสาขา</th>
                <th>ชื่อสาขา</th>
                <th>รายการ Barcode</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              @for (branch of filtered(); track branch.id) {
                <tr>
                  <td>{{ branch.id }}</td>
                  <td>
                    {{ branch.name }}
                    @if (!branch.isActive) {
                      <small>ปิดใช้งาน</small>
                    }
                  </td>
                  <td>{{ branch.count }}</td>
                  <td>
                    <a [routerLink]="['/branches', branch.id]"
                      >เปิดรายละเอียด</a
                    >
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="empty">ไม่พบข้อมูลสาขา</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <p class="muted">ข้อมูลสาขาจาก DataHub เฉพาะ Branch Level = 1</p>
    }`,
})
export class Branches implements OnInit {
  readonly activeOptions = [
    { label: "เปิดใช้งาน", value: true },
    { label: "ปิดใช้งาน", value: false },
  ];
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly detailId = Number(this.route.snapshot.paramMap.get("id")) || 0;
  readonly editing = !!this.route.snapshot.data["editing"];
  readonly rows = signal<Branch[]>([]);
  readonly edit = signal<Branch | null>(null);
  readonly busy = signal(false);
  search = "";
  applied = "";
  ngOnInit() {
    if (this.editing && !this.detailId)
      this.edit.set({ id: 0, name: "", isActive: true, count: 0 });
    this.load();
  }
  referenceOptions() {
    return this.rows().map((b) => ({ ...b, label: `${b.name} (${b.id})` }));
  }
  selectBranch(id: number) {
    const branch = this.rows().find((b) => b.id === id);
    if (branch) this.edit.set(structuredClone(branch));
  }
  detail() {
    return this.rows().find((b) => b.id === this.detailId);
  }
  filtered() {
    return this.rows().filter(
      (b) =>
        String(b.id).includes(this.applied) ||
        (b.name || "").includes(this.applied),
    );
  }
  load() {
    this.busy.set(true);
    this.api
      .branches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.rows.set(b);
          if (this.editing && this.detailId) {
            const branch = this.detail();
            if (branch) this.edit.set(structuredClone(branch));
          }
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.feedback.error(e, () => this.load());
        },
      });
  }
  save(branch: Branch) {
    if (this.busy() || !branch.name?.trim() || branch.id < 1) return;
    this.performSave(structuredClone(branch), crypto.randomUUID());
  }
  private performSave(branch: Branch, key: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.api
      .saveBranch(branch.id, branch.name!, branch.isActive, key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router
            .navigate(["/branches", branch.id])
            .then(() => this.feedback.success("บันทึกสาขาสำเร็จ"));
        },
        error: (e) => {
          this.busy.set(false);
          this.feedback.error(e, () => this.performSave(branch, key));
        },
      });
  }
}
@Component({
  imports: [FormsModule, DatePipe, RouterLink, ButtonModule],
  template: `<div class="page-heading">
      <div>
        <h1>ประวัติการทำงาน</h1>
        <p class="muted">
          ทุกสาขาในโครงการ ปณ. • บันทึกการเปลี่ยนแปลงและการเข้าถึงเอกสาร
        </p>
      </div>
    </div>
    <form class="management-toolbar" (ngSubmit)="page.set(1); load()">
      <label
        >ค้นหา<input
          name="search"
          [(ngModel)]="search"
          placeholder="เลขรายการ รหัสสาขา ผู้ดำเนินการ หรือกิจกรรม" /></label
      ><p-button type="submit" label="ค้นหา" [loading]="busy()" />
    </form>
    @if (barcodeId || branchId) {
      <p class="muted audit-scope">
        กรองรายการ {{ barcodeId || "ทั้งหมด" }} • สาขา
        {{ branchId || "ทั้งหมด" }}
      </p>
    }
    <section class="card management-table">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>กิจกรรม</th>
              <th>รายการที่เกี่ยวข้อง</th>
              <th>ผู้ดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of rows(); track item.id) {
              <tr>
                <td>{{ item.createdUtc | date: "dd/MM/yyyy HH:mm:ss" }}</td>
                <td>
                  {{ actionName(item.action) }}
                  <details class="audit-details">
                    <summary>ดูรายละเอียด</summary>
                    <pre>{{ item.detailsJson }}</pre>
                  </details>
                </td>
                <td>
                  @if (item.barcodeId) {
                    <a
                      [routerLink]="['/barcodes', item.barcodeId, 'document']"
                      >{{ item.barcodeId }}</a
                    >
                  } @else {
                    —
                  }
                  <small>สาขา {{ item.branchId || "—" }}</small>
                </td>
                <td>
                  {{ item.actorSubject }}<small>{{ item.actorIssuer }}</small>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">
                  {{ busy() ? "กำลังโหลด…" : "ไม่พบประวัติ" }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <div class="pagination">
      <a routerLink="/barcodes" class="button secondary">เปิดรายการ Barcode</a
      ><span>{{ total() }} รายการ • หน้า {{ page() }}</span>
      <div class="actions">
        <p-button
          label="ก่อนหน้า"
          severity="secondary"
          [disabled]="page() === 1 || busy()"
          (onClick)="change(-1)"
        /><p-button
          label="ถัดไป"
          severity="secondary"
          [disabled]="page() * 30 >= total() || busy()"
          (onClick)="change(1)"
        />
      </div>
    </div>`,
})
export class History implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  private readonly route = inject(ActivatedRoute);
  readonly rows = signal<Audit[]>([]);
  readonly busy = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly actionName = actionName;
  search = "";
  barcodeId =
    Number(this.route.snapshot.queryParamMap.get("barcodeId")) || null;
  branchId = Number(this.route.snapshot.queryParamMap.get("branchId")) || null;
  ngOnInit() {
    this.load();
  }
  change(delta: number) {
    this.page.update((p) => p + delta);
    this.load();
  }
  load() {
    if (this.busy()) return;
    this.busy.set(true);
    this.api
      .audit({
        page: this.page(),
        pageSize: 30,
        search: this.search,
        ...(this.barcodeId ? { barcodeId: this.barcodeId } : {}),
        ...(this.branchId ? { branchId: this.branchId } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.rows.set(r.body || []);
          this.total.set(Number(r.headers.get("X-Total-Count")) || 0);
          this.busy.set(false);
        },
        error: (e) => {
          this.busy.set(false);
          this.feedback.error(e, () => this.load());
        },
      });
  }
}
@Component({
  template: `<h1>คู่มือการใช้งาน</h1>
    <section class="card detail-card">
      <h2>สำนักงานใหญ่</h2>
      <ol>
        <li>สร้างรายการ หรือเลือกนำเข้าข้อมูลจาก Excel/CSV</li>
        <li>ตรวจสอบสาขาและข้อมูลแบบร่าง แล้วบันทึก</li>
        <li>
          ตรวจสอบข้อมูลแล้วบันทึก ระบบสร้าง Barcode เมื่อจำเป็น
          และแนบใบลายมือชื่อ PDF/JPEG/PNG (ไม่เกิน 20 MiB) ให้เอกสารปัจจุบัน
        </li>
        <li>
          ข้อมูลเดิมใช้ PDF เดิม หากแก้ข้อมูลจะอัปเดต PDF โดยไม่เก็บ PDF Barcode
          เก่า
        </li>
      </ol>
      <h2>สาขา</h2>
      <ol>
        <li>เปิดรายการของสาขาและตรวจสอบฉบับเอกสาร</li>
        <li>ดูใบ Barcode และใบลายมือชื่อคู่กัน ดาวน์โหลดเอกสารของสาขาได้</li>
        <li>สำนักงานใหญ่เป็นผู้แนบและแทนใบลายมือชื่อ</li>
      </ol>
      <p>
        หากไม่สำเร็จให้กด “ลองใหม่” ในข้อความแจ้งเตือน
        การแทนใบเซ็นจะเก็บไฟล์เดิมไว้ในประวัติ
        และใบเซ็นจะไม่ย้ายไปยังฉบับใหม่โดยอัตโนมัติ
      </p>
    </section>`,
})
export class Manual {
  private readonly destroyRef = inject(DestroyRef);
}
