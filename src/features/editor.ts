import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { SelectModule } from "primeng/select";
import { Api } from "../core/api";
import { Barcode, BarcodeInput, Branch } from "../core/models";
import { DocumentViewer } from "../shared/document-viewer";
import { Feedback } from "../shared/feedback";
@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    SelectModule,
    DocumentViewer,
  ],
  template: ` <div class="page-heading">
      <div>
        <h1>{{ targetId ? "แก้ไขข้อมูล Barcode" : "สร้างรายการ Barcode" }}</h1>
        <p class="muted">
          {{
            id
              ? "สร้าง PDF เมื่อข้อมูลเปลี่ยนแปลง หากข้อมูลเดิมจะใช้ไฟล์ Barcode ที่มีอยู่"
              : "กรอกข้อมูลเพื่อตรวจสอบและสร้างใบ Barcode ของโครงการ ปณ."
          }}
        </p>
      </div>
    </div>
    <form [formGroup]="form" (ngSubmit)="review()">
      <section class="card editor revised-editor">
        <div class="info-banner">
          <strong>{{
            id ? "ตรวจสอบข้อมูลก่อนบันทึก" : "ข้อมูลอ้างอิงจากระบบเดิม"
          }}</strong>
          <p>
            {{
              id
                ? "ข้อมูลไม่เปลี่ยนจะใช้ PDF เดิม หากแก้ข้อมูลจะอัปเดต PDF และต้องแนบใบลายมือชื่อให้เอกสารที่อัปเดต"
                : "เลขที่รายการจัดสรรโดยระบบ ใช้ประเภท POST / PPPP และข้อมูลข้อความครบทั้งสามบรรทัด"
            }}
          </p>
        </div>
        <div class="form-grid single">
          <label for="owner-branch"
            >สาขาเจ้าของรายการ *<p-select
              inputId="owner-branch"
              ariaLabel="สาขาเจ้าของรายการ *"
              formControlName="branchId"
              [options]="branchOptions()"
              optionLabel="label"
              optionValue="id"
              optionDisabled="disabled"
              [filter]="true"
              filterBy="label"
              filterPlaceholder="ค้นหารหัสหรือชื่อสาขา"
              placeholder="เลือกสาขา"
              emptyFilterMessage="ไม่พบสาขา"
              emptyMessage="ไม่มีข้อมูลสาขา"
              appendTo="body"
            />
            @if (row()?.hasGeneratedPdf) {
              <small>ตรึงสาขาหลังออกเอกสารแล้ว</small>
            }
          </label>
        </div>
        <div class="form-grid thirds">
          <label for="barcode-type"
            >ประเภท Barcode *<p-select
              inputId="barcode-type"
              ariaLabel="ประเภท Barcode *"
              formControlName="comp"
              [options]="barcodeTypes"
              appendTo="body"
          /></label>
          <label
            >เลขประจำตัวผู้เสียภาษี *<input
              formControlName="tax"
              maxlength="13" /></label
          ><label
            >Suffix *<input
              formControlName="suffix"
              maxlength="2"
              placeholder="00"
          /></label>
          <label
            >เลขอ้างอิง 1 *<input
              formControlName="ref1"
              maxlength="15" /></label
          ><label
            >เลขอ้างอิง 2<input formControlName="ref2" maxlength="15" /></label
          ><label
            >เลขอ้างอิง 3<input formControlName="ref3" maxlength="15"
          /></label>
        </div>
        <div class="form-grid thirds">
          <label
            >ข้อความบรรทัดที่ 1 *<input formControlName="textLevel1" /></label
          ><label
            >ข้อความบรรทัดที่ 2 *<input formControlName="textLevel2" /></label
          ><label
            >ข้อความบรรทัดที่ 3 *<input formControlName="textLevel3"
          /></label>
        </div>
        @if (form.touched && form.invalid) {
          <p class="validation" role="alert">
            กรุณากรอกข้อมูลที่จำเป็นให้ครบและตรวจสอบรูปแบบข้อมูล
          </p>
        }
      </section>
      <section class="card optional-signature">
        <div>
          <h2>ใบลายมือชื่อ (ถ้ามี)</h2>
          <p>แนบพร้อมบันทึกข้อมูล หรือแนบภายหลังจากหน้าดูเอกสาร</p>
          <small class="muted"
            >แนบใบลายมือชื่อกับ Barcode ปัจจุบัน โดยไม่สร้าง PDF
            ซ้ำเมื่อข้อมูลเดิม</small
          >
          @if (upload()) {
            <p>{{ upload()!.name }}</p>
          }
        </div>
        <label class="button file-picker"
          >เลือกไฟล์<input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            [disabled]="locked()"
            (change)="chooseFile($event)"
        /></label>
      </section>
      <div class="actions">
        <p-button
          type="submit"
          label="ตรวจสอบข้อมูล"
          [disabled]="locked() || loading() || !form.enabled"
        /><a
          [routerLink]="targetId ? ['/barcodes', targetId] : ['/barcodes']"
          class="button secondary"
          [class.disabled]="busy()"
          >ยกเลิก</a
        >
      </div>
    </form>
    @if (preview()) {
      <div class="review-backdrop">
        <section
          class="card review-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-title"
        >
          <h2 id="review-title">ตรวจสอบข้อมูลก่อนบันทึก</h2>
          <dl class="data-grid">
            <div>
              <dt>สาขา</dt>
              <dd>{{ branchName() }}</dd>
            </div>
            <div>
              <dt>ประเภท</dt>
              <dd>{{ form.getRawValue().comp }}</dd>
            </div>
            <div>
              <dt>เลขประจำตัวผู้เสียภาษี / Suffix</dt>
              <dd>
                {{ form.getRawValue().tax }} / {{ form.getRawValue().suffix }}
              </dd>
            </div>
            <div>
              <dt>เลขอ้างอิง 1 / 2 / 3</dt>
              <dd>
                {{ form.getRawValue().ref1 }} /
                {{ form.getRawValue().ref2 || "—" }} /
                {{ form.getRawValue().ref3 || "—" }}
              </dd>
            </div>
          </dl>
          <p>{{ form.getRawValue().textLevel1 }}</p>
          <p>{{ form.getRawValue().textLevel2 }}</p>
          <p>{{ form.getRawValue().textLevel3 }}</p>
          <p class="muted">
            {{ upload()?.name || "ไม่แนบใบลายมือชื่อ" }} • ระบบจะใช้ PDF
            เดิมหากข้อมูลไม่เปลี่ยน
          </p>
          <div class="form-actions">
            <p-button
              label="กลับไปแก้ไข"
              severity="secondary"
              (onClick)="preview.set(false)"
            /><p-button [label]="saveLabel()" (onClick)="save()" />
          </div>
        </section>
      </div>
    }
    @if (locked() && !busy()) {
      <div class="warning-banner">
        {{ stage() }}ไม่สำเร็จ กด “ลองใหม่” เพื่อทำต่อจากขั้นตอนเดิม
        {{
          row()?.hasGeneratedPdf
            ? "เอกสารฉบับก่อนยังคงอยู่"
            : "ระบบจะทำต่อจากขั้นตอนที่ยังไม่สำเร็จ"
        }}
      </div>
      <p-button label="ทำต่อจากขั้นตอนเดิม" (onClick)="resume()" />
    }
    @if (failed() && row()?.hasGeneratedPdf) {
      <div class="document-pair previous-documents">
        <document-viewer
          title="ใบ Barcode ฉบับก่อน"
          [file]="previousFile('generated')"
        /><document-viewer
          title="ใบลายมือชื่อฉบับก่อน"
          [file]="previousFile('signed')"
        />
      </div>
    }`,
})
export class Editor implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly feedback = inject(Feedback);
  readonly id = Number(this.route.snapshot.paramMap.get("id")) || 0;
  readonly row = signal<Barcode | null>(null);
  readonly branches = signal<Branch[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly branchOptions = computed(() =>
    this.branches().map((b) => ({
      ...b,
      label: `${b.name || "สาขา"} (${b.id})${b.isActive ? "" : " (ปิดใช้งาน)"}`,
      disabled: !b.isActive && b.id !== this.row()?.branchId,
    })),
  );
  readonly barcodeTypes = ["POST", "PPPP"];
  private readonly fb = inject(FormBuilder);
  private key = crypto.randomUUID();
  targetId = this.id;
  readonly form = this.fb.group({
    branchId: [0, [Validators.required, Validators.min(1)]],
    comp: ["POST", Validators.required],
    tax: ["", [Validators.required, Validators.maxLength(13)]],
    suffix: ["", [Validators.required, Validators.maxLength(2)]],
    ref1: ["", [Validators.required, Validators.maxLength(15)]],
    ref2: ["", Validators.maxLength(15)],
    ref3: ["", Validators.maxLength(15)],
    textLevel1: ["", Validators.required],
    textLevel2: ["", Validators.required],
    textLevel3: ["", Validators.required],
  });
  ngOnInit() {
    this.api
      .branches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => this.branches.set(b),
        error: (e) => this.feedback.error(e),
      });
    if (this.id) this.loadRow(this.id);
  }
  private loadRow(id: number) {
    this.loading.set(true);
    this.form.disable();
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (row) => {
          this.row.set(row);
          this.form.enable();
          this.form.patchValue(row);
          if (row.hasGeneratedPdf) this.form.controls.branchId.disable();
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.feedback.error(e, () => this.loadRow(id));
        },
      });
  }
  readonly preview = signal(false);
  readonly upload = signal<File | null>(null);
  readonly locked = signal(false);
  readonly failed = signal(false);
  readonly stage = signal("บันทึกข้อมูล");
  private savedId: number | null = null;
  private generationInput: Barcode | null = null;
  private generatedDocument: string | null = null;
  private generateKey = crypto.randomUUID();
  private uploadKey = crypto.randomUUID();
  private submitted: BarcodeInput | null = null;
  branchName() {
    return (
      this.branches().find((b) => b.id === this.form.getRawValue().branchId)
        ?.name || "—"
    );
  }
  previousFile(kind: string) {
    return (
      this.row()?.files.find((f) => f.fileType === kind && f.isActive) || null
    );
  }
  dataChanged() {
    const row = this.row();
    return (
      !row ||
      Object.entries(this.form.getRawValue()).some(
        ([key, value]) =>
          String(value ?? "").trim() !==
          String(row[key as keyof Barcode] ?? "").trim(),
      )
    );
  }
  saveLabel() {
    return this.row()?.hasGeneratedPdf && !this.dataChanged()
      ? this.upload()
        ? "อัปโหลดใบลายมือชื่อ"
        : "บันทึกข้อมูล"
      : "บันทึกและสร้าง Barcode";
  }
  chooseFile(event: Event) {
    if (this.locked()) return;
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (
      file &&
      (file.size > 20 * 1024 * 1024 || !/\.(pdf|jpe?g|png)$/i.test(file.name))
    ) {
      this.upload.set(null);
      this.feedback.error({
        error: { message: "เลือกไฟล์ PDF, JPEG หรือ PNG ขนาดไม่เกิน 20 MiB" },
      });
      return;
    }
    this.upload.set(file);
  }
  review() {
    if (this.locked() || this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.valid) this.preview.set(true);
  }
  save() {
    if (this.locked() || this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.submitted = {
      ...structuredClone(this.form.getRawValue()),
      amount: this.row()?.amount ?? null,
    } as BarcodeInput;
    this.preview.set(false);
    this.locked.set(true);
    this.form.disable();
    this.resume();
  }
  resume() {
    if (this.busy() || !this.submitted) return;
    this.busy.set(true);
    this.failed.set(false);
    if (this.savedId) {
      this.loadForGeneration();
      return;
    }
    this.stage.set("บันทึกข้อมูล");
    this.feedback.working("กำลังบันทึกข้อมูล");
    const request = this.targetId
      ? this.api.update(
          this.targetId,
          this.submitted,
          this.row()!.rowVersion,
          this.key,
        )
      : this.api.create(this.submitted, this.key);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (!result.id) {
          this.fail({ error: { message: "ระบบไม่คืนเลขที่รายการ" } });
          return;
        }
        this.savedId = result.id;
        if (result.uuid) {
          this.generatedDocument = result.uuid;
          this.uploadSignature();
          return;
        }
        this.loadForGeneration();
      },
      error: (error) => this.fail(error),
    });
  }
  private loadForGeneration() {
    if (this.generationInput) {
      this.generateDocument();
      return;
    }
    this.api
      .get(this.savedId!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (row) => {
          const changed = Object.entries(this.submitted!).some(
            ([key, value]) =>
              key !== "id" &&
              String(value ?? "").trim() !==
                String(row[key as keyof Barcode] ?? "").trim(),
          );
          if (changed) {
            this.fail({ status: 409 });
            return;
          }
          this.generationInput = row;
          this.generateDocument();
        },
        error: (error) => this.fail(error),
      });
  }
  private generateDocument() {
    if (this.generatedDocument) {
      this.uploadSignature();
      return;
    }
    this.stage.set("สร้าง Barcode");
    this.feedback.working("กำลังสร้าง Barcode", "เอกสารฉบับเดิมยังคงอยู่");
    this.api
      .generate(this.generationInput!, this.generateKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!result.uuid) {
            this.fail({ error: { message: "ระบบไม่คืนไฟล์เอกสาร" } });
            return;
          }
          this.generatedDocument = result.uuid;
          this.uploadSignature();
        },
        error: (error) => this.fail(error),
      });
  }
  private uploadSignature() {
    const file = this.upload();
    if (!file) {
      this.finish();
      return;
    }
    this.stage.set("อัปโหลดใบลายมือชื่อ");
    this.feedback.working("กำลังอัปโหลดใบลายมือชื่อ");
    this.api
      .signed(this.savedId!, file, this.uploadKey, this.generatedDocument!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finish(),
        error: (error) => this.fail(error),
      });
  }
  private finish() {
    this.busy.set(false);
    void this.router
      .navigate(["/barcodes", this.savedId, "document"])
      .then(() =>
        this.feedback.success(
          "บันทึกสำเร็จ",
          this.upload()
            ? "แนบใบลายมือชื่อแล้ว"
            : "เอกสารพร้อมเปิดดูและดาวน์โหลด",
        ),
      );
  }
  private fail(error: unknown) {
    this.busy.set(false);
    const problem = error as {
      status?: number;
      error?: { code?: string; existingId?: number };
    };
    if (problem.error?.code === "duplicate_barcode") {
      this.failed.set(false);
      this.locked.set(false);
      this.form.enable();
      if (this.row()?.hasGeneratedPdf) this.form.controls.branchId.disable();
      this.submitted = null;
      this.key = crypto.randomUUID();
      this.feedback.error(error);
      if (problem.error.existingId)
        this.feedback.notice.update((notice) =>
          notice
            ? {
                ...notice,
                actions: [
                  {
                    label: "เปิดรายการเดิม",
                    run: () =>
                      void this.router.navigate([
                        "/barcodes",
                        problem.error!.existingId,
                        "document",
                      ]),
                  },
                ],
              }
            : notice,
        );
      return;
    }
    this.failed.set(true);
    if (problem.status === 409) {
      this.reloadConflict();
      return;
    }
    this.feedback.error(
      error,
      () => this.resume(),
      this.stage() + " ไม่สำเร็จ",
    );
  }
  private reloadConflict() {
    const id = this.savedId || this.targetId;
    if (!id) {
      this.feedback.error({
        error: {
          message: "เลขที่รายการขัดแย้ง กรุณากลับรายการและตรวจสอบข้อมูล",
        },
      });
      return;
    }
    this.busy.set(true);
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (row) => {
          this.targetId = id;
          this.row.set(row);
          this.form.enable();
          this.form.patchValue(row);
          if (row.hasGeneratedPdf) this.form.controls.branchId.disable();
          this.savedId = null;
          this.generationInput = null;
          this.generatedDocument = null;
          this.submitted = null;
          this.upload.set(null);
          this.key = crypto.randomUUID();
          this.generateKey = crypto.randomUUID();
          this.uploadKey = crypto.randomUUID();
          this.busy.set(false);
          this.locked.set(false);
          this.failed.set(false);
          this.preview.set(false);
          this.feedback.error({
            error: {
              message:
                "ข้อมูลเปลี่ยนแปลงแล้ว โหลดข้อมูลล่าสุดให้แล้ว กรุณาตรวจสอบ preview และเลือกใบลายมือชื่ออีกครั้งก่อนบันทึก",
            },
          });
        },
        error: (error) => {
          this.busy.set(false);
          this.feedback.error(error, () => this.reloadConflict());
        },
      });
  }
}
