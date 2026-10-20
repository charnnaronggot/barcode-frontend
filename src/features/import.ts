import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { Api } from "../core/api";
import { ImportPreview } from "../core/models";
import { Feedback } from "../shared/feedback";
import { BulkGeneration } from "../core/bulk-generation";
export const importFields = [
  "id",
  "branch_id",
  "comp",
  "tax",
  "suffix",
  "ref_1",
  "ref_2",
  "ref_3",
  "text_level_1",
  "text_level_2",
  "text_level_3",
];
@Component({
  imports: [FormsModule, ButtonModule, SelectModule],
  template: `
    <div class="page-heading">
      <div>
        <h1>
          {{
            "นำเข้าข้อมูล — " +
              (step() === 1
                ? "เลือกไฟล์"
                : step() === 2
                  ? "จับคู่คอลัมน์"
                  : preview()?.errors?.length
                    ? "แก้ข้อผิดพลาด"
                    : "ตรวจสอบ")
          }}
        </h1>
        <p class="muted">
          นำเข้าเฉพาะแถวที่ Compcode ไม่ว่างจาก Excel หรือ CSV
          และตรวจสอบข้อมูลก่อนบันทึก
        </p>
      </div>
    </div>
    <ol class="steps">
      @for (
        title of ["เลือกไฟล์", "จับคู่คอลัมน์", "ตรวจสอบข้อมูล", "ผลนำเข้า"];
        track $index
      ) {
        <li [class.active]="step() === $index + 1">
          <span>{{ $index + 1 }}</span
          >{{ title }}
        </li>
      }
    </ol>
    <section class="card editor import-card">
      @if (step() === 1) {
        <label class="import-owner"
          >สาขาเจ้าของข้อมูล<input
            value="อ่านจากคอลัมน์ branch_id ในไฟล์"
            disabled
        /></label>
        <div
          class="file-drop"
          (dragover)="$event.preventDefault()"
          (drop)="drop($event)"
        >
          <h2>เลือกไฟล์ข้อมูล Excel หรือ CSV</h2>
          <p class="muted">ตรวจข้อมูลและข้อผิดพลาดก่อนบันทึกเข้าโครงการ</p>
          <label class="button file-picker"
            >เลือกไฟล์<input
              type="file"
              accept=".xlsx,.csv"
              [disabled]="busy()"
              (change)="choose($event)"
          /></label>
          @if (file()) {
            <strong>{{ file()!.name }}</strong>
          }
        </div>
        <p class="muted import-limit">
          รองรับ .xlsx และ CSV (UTF-8) ไม่เกิน 10 MiB / 10,000 แถว •
          ข้อมูลข้อความควรใช้รูปแบบ Text เพื่อคงศูนย์นำหน้า
        </p>
        <div class="form-actions">
          <a href="/import-template.csv" download class="button secondary"
            >ดาวน์โหลดตัวอย่าง</a
          ><p-button
            label="ถัดไป: จับคู่คอลัมน์"
            [disabled]="!file() || busy()"
            [loading]="busy()"
            (onClick)="firstPreview()"
          />
        </div>
      }
      @if (preview(); as preview) {
        @if (step() === 2) {
          <h2>เลือก Sheet และจับคู่คอลัมน์</h2>
          <p class="muted">{{ file()?.name }} · {{ preview.count }} แถว</p>
          @if (preview.sheets.length) {
            <label for="import-sheet"
              >Sheet<p-select
                inputId="import-sheet"
                ariaLabel="Sheet"
                [(ngModel)]="sheet"
                (ngModelChange)="changeSheet()"
                [options]="sheetOptions()"
                optionLabel="label"
                optionValue="value"
                [disabled]="busy()"
                appendTo="body"
            /></label>
          }
          <div class="table-scroll mapping-table">
            <table>
              <thead>
                <tr>
                  <th>คอลัมน์ในไฟล์</th>
                  <th>ฟิลด์ในระบบ</th>
                  <th>ตัวอย่างค่า</th>
                </tr>
              </thead>
              <tbody>
                @for (field of fields; track field) {
                  <tr>
                    <td>
                      <p-select
                        [ariaLabel]="'คอลัมน์สำหรับ ' + field"
                        [(ngModel)]="mapping[field]"
                        [options]="columnOptions()"
                        optionLabel="label"
                        optionValue="value"
                        [filter]="true"
                        filterBy="label"
                        filterPlaceholder="ค้นหาคอลัมน์"
                        emptyFilterMessage="ไม่พบคอลัมน์"
                        [disabled]="busy()"
                        appendTo="body"
                      />
                    </td>
                    <td>{{ field }} {{ required(field) ? "*" : "" }}</td>
                    <td class="sample-value">
                      {{ preview.sample[0]?.[mapping[field]] ?? "—" }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <details>
            <summary>ตัวอย่างข้อมูล (สูงสุด 50 แถว)</summary>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    @for (header of preview.headers; track $index) {
                      <th>{{ header }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of preview.sample; track $index) {
                    <tr>
                      @for (cell of row; track $index) {
                        <td>{{ cell }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
          <div class="form-actions">
            <p-button
              label="ย้อนกลับ"
              severity="secondary"
              [disabled]="busy()"
              (onClick)="feedback.clear(); step.set(1)"
            /><p-button
              label="ตรวจสอบข้อมูล"
              [loading]="busy()"
              [disabled]="busy()"
              (onClick)="validate()"
            />
          </div>
        }
        @if (step() === 3) {
          <h2>ตรวจสอบข้อมูลก่อนนำเข้า</h2>
          <p>{{ file()?.name }} · {{ preview.count }} รายการ</p>
          @if (preview.errors.length) {
            <div class="warning-banner">
              พบ {{ preview.errors.length }} ข้อผิดพลาด
              กรุณาแก้ไขไฟล์หรือการจับคู่คอลัมน์ก่อนนำเข้า
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>แถว</th>
                    <th>คอลัมน์</th>
                    <th>ข้อผิดพลาด</th>
                  </tr>
                </thead>
                <tbody>
                  @for (error of preview.errors; track $index) {
                    <tr>
                      <td>{{ error.row }}</td>
                      <td>{{ error.column }}</td>
                      <td>{{ error.message }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="success-banner">
              ข้อมูลผ่านการตรวจสอบ {{ preview.count }} รายการ
            </div>
            <div class="info-banner">
              ระบบจะตรวจสอบซ้ำขณะบันทึก ทุกแถวต้องสำเร็จจึงจะนำเข้าได้
            </div>
          }
          <div class="form-actions">
            <p-button
              label="กลับไปจับคู่คอลัมน์"
              severity="secondary"
              [disabled]="busy()"
              (onClick)="feedback.clear(); step.set(2)"
            /><p-button
              label="ยืนยันนำเข้า"
              [disabled]="!!preview.errors.length || busy()"
              [loading]="busy()"
              (onClick)="commit()"
            />
          </div>
        }
      }
    </section>
  `,
})
export class ImportPage {
  readonly sheetOptions = computed(() =>
    (this.preview()?.sheets ?? []).map((label, value) => ({ label, value })),
  );
  readonly columnOptions = computed(() => [
    { label: "ไม่เลือก", value: -1 },
    ...(this.preview()?.headers ?? []).map((header, value) => ({
      label: `${value + 1}. ${header}`,
      value,
    })),
  ]);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  readonly feedback = inject(Feedback);
  readonly fields = importFields;
  readonly bulk = inject(BulkGeneration);
  readonly step = signal(1);
  readonly file = signal<File | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly busy = signal(false);
  sheet = 0;
  mapping: Record<string, number> = {};
  private commitKey = crypto.randomUUID();
  private committedFile: File | null = null;
  private committedMapping = "";
  required(field: string) {
    return !["id", "ref_2", "ref_3"].includes(field);
  }
  reset() {
    this.feedback.clear();
    this.file.set(null);
    this.preview.set(null);
    this.sheet = 0;
    this.mapping = {};
    this.step.set(1);
  }
  choose(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.reset();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !/\.(xlsx|csv)$/i.test(file.name)) {
      this.feedback.error({
        error: { message: "รองรับเฉพาะ .xlsx หรือ CSV ขนาดไม่เกิน 10 MiB" },
      });
      return;
    }
    this.file.set(file);
  }
  drop(event: DragEvent) {
    event.preventDefault();
    if (this.busy()) return;
    this.selectFile(event.dataTransfer?.files?.[0]);
  }
  private selectFile(file: File | undefined) {
    this.reset();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024 || !/\.(xlsx|csv)$/i.test(file.name)) {
      this.feedback.error({
        error: { message: "รองรับเฉพาะ .xlsx หรือ CSV ขนาดไม่เกิน 10 MiB" },
      });
      return;
    }
    this.file.set(file);
  }
  firstPreview() {
    this.read(false, 2);
  }
  changeSheet() {
    this.feedback.clear();
    this.mapping = {};
    this.read(false, 2);
  }
  validate() {
    this.read(true, 3);
  }
  private read(mapped: boolean, step: number) {
    if (this.busy() || !this.file()) return;
    this.busy.set(true);
    this.api
      .preview(this.file()!, mapped ? this.mapping : undefined, this.sheet)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.preview.set(preview);
          if (!mapped)
            this.mapping = Object.fromEntries(
              this.fields.map((field) => [
                field,
                preview.headers.findIndex(
                  (header) =>
                    header.trim().toLowerCase() === field ||
                    (field === "comp" &&
                      header.trim().toLowerCase().replace(/[_ ]/g, "") ===
                        "compcode"),
                ),
              ]),
            );
          this.busy.set(false);
          this.step.set(step);
        },
        error: (error) => {
          this.busy.set(false);
          this.feedback.error(error, () => this.read(mapped, step));
        },
      });
  }
  commit() {
    if (this.busy() || !this.file() || this.preview()?.errors.length) return;
    const fingerprint = JSON.stringify({
      mapping: this.mapping,
      sheet: this.sheet,
    });
    if (
      this.committedFile !== this.file() ||
      this.committedMapping !== fingerprint
    ) {
      this.commitKey = crypto.randomUUID();
      this.committedFile = this.file();
      this.committedMapping = fingerprint;
    }
    this.performCommit(
      this.file()!,
      structuredClone(this.mapping),
      this.sheet,
      this.commitKey,
    );
  }
  private performCommit(
    file: File,
    mapping: Record<string, number>,
    sheet: number,
    key: string,
  ) {
    if (this.busy()) return;
    this.busy.set(true);
    this.feedback.working("กำลังนำเข้าข้อมูล");
    this.api
      .commitImport(file, mapping, sheet, key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.reset();
          this.feedback.choice(
            "นำเข้าข้อมูลสำเร็จ",
            `บันทึกรายการทั้งหมด ${result.count} รายการแล้ว`,
            [
              {
                label: "สร้าง Barcode ทั้งหมด",
                run: () => this.bulk.start(result.ids ?? []),
              },
              { label: "ทำภายหลัง", run: () => this.feedback.clear() },
            ],
          );
        },
        error: (error) => {
          this.busy.set(false);
          if (Array.isArray(error.error?.errors)) {
            this.preview.update((preview) =>
              preview ? { ...preview, errors: error.error.errors } : preview,
            );
            this.step.set(3);
            this.feedback.error(error);
            return;
          }
          this.feedback.error(error, () =>
            this.performCommit(file, mapping, sheet, key),
          );
        },
      });
  }
}
