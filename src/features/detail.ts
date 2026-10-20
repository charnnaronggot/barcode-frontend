import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { Api } from "../core/api";
import { Auth } from "../core/auth";
import { Barcode, DocumentFile } from "../core/models";
import { Feedback } from "../shared/feedback";

import { DocumentViewer } from "../shared/document-viewer";
@Component({
  imports: [FormsModule, RouterLink, ButtonModule, DatePipe, DocumentViewer],
  template: ` @if (row(); as row) {
      <div class="page-heading document-heading">
        <div>
          <h1>ใบ Barcode และใบลายมือชื่อ</h1>
          <p class="muted">เลขที่ {{ row.id }} • {{ row.branchName }}</p>
        </div>
      </div>
      <div class="document-pair">
        <document-viewer
          title="ใบ Barcode"
          [file]="generatedFile()"
          [caption]="
            generatedFile() ? 'เอกสารปัจจุบัน' : 'ยังไม่ได้สร้าง Barcode'
          "
          emptyMessage="สำนักงานใหญ่จะสร้างเอกสารเมื่อบันทึกข้อมูลสำเร็จ"
        />
        <document-viewer
          title="ใบลายมือชื่อ"
          [file]="activeSigned()"
          [caption]="
            activeSigned()
              ? 'อัปโหลดโดยสำนักงานใหญ่'
              : auth.session()?.isHq
                ? 'ยังไม่ได้อัปโหลดใบลายมือชื่อ'
                : 'รอสำนักงานใหญ่แนบใบลายมือชื่อ'
          "
          [emptyMessage]="
            auth.session()?.isHq
              ? 'อัปโหลดใบลายมือชื่อให้ใบ Barcode ฉบับนี้ได้จากปุ่มด้านล่าง'
              : 'สำนักงานใหญ่ยังไม่ได้อัปโหลดไฟล์สำหรับเอกสารฉบับนี้'
          "
        />
      </div>
      <div class="actions document-actions">
        <a routerLink="/barcodes" class="button secondary">กลับรายการ</a>
        @if (auth.session()?.capabilities?.edit) {
          <a [routerLink]="['/barcodes', row.id, 'edit']" class="button"
            >แก้ไขข้อมูล</a
          >
        }
        @if (auth.session()?.capabilities?.generate) {
          <p-button
            [label]="
              row.hasGeneratedPdf ? 'อัปเดตไฟล์ Barcode' : 'สร้าง Barcode'
            "
            [disabled]="!!busy()"
            [loading]="busy() === 'generate'"
            (onClick)="generate()"
          />
        }
      </div>
      @if (auth.session()?.capabilities?.uploadSigned && generatedFile()) {
        <details
          class="card detail-card signature-replacement"
          [open]="openSignature"
        >
          <summary>
            {{ activeSigned() ? "แทนใบลายมือชื่อ" : "แนบใบลายมือชื่อ" }}
          </summary>
          <p class="muted">
            แนบกับ PDF ปัจจุบันโดยไม่สร้าง Barcode ใหม่
            การแทนใบลายมือชื่อจะเก็บไฟล์เดิมไว้ในประวัติ
          </p>
          <label class="upload-zone"
            >เลือกใบลายมือชื่อ<input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              [disabled]="!!busy()"
              (change)="chooseFile($event)"
            /><small>{{
              upload()?.name || "PDF, JPEG หรือ PNG ไม่เกิน 20 MiB"
            }}</small></label
          >
          <label class="check-label"
            ><input
              type="checkbox"
              [(ngModel)]="confirmed"
              [disabled]="!!busy()"
            />ยืนยันรายการ {{ row.id }} • {{ row.branchName }}</label
          >
          <p-button
            label="อัปโหลดใบลายมือชื่อ"
            [disabled]="!upload() || !confirmed || !!busy()"
            [loading]="busy() === 'signed'"
            (onClick)="sendSigned()"
          />
        </details>
      }
      @if (history().length) {
        <details class="card detail-card">
          <summary>ประวัติใบลายมือชื่อที่ถูกแทน</summary>
          @for (file of history(); track file.uuid) {
            <p>
              <button class="text-link" (click)="historicalFile.set(file)">
                {{ file.originalName || file.fileType }} •
                {{ file.createdUtc | date: "dd/MM/yyyy HH:mm" }}
              </button>
            </p>
          }
          @if (historicalFile()) {
            <document-viewer title="ไฟล์ในประวัติ" [file]="historicalFile()" />
          }
        </details>
      }
    } @else {
      <section class="card empty">
        {{ loading() ? "กำลังโหลดรายละเอียด…" : "ไม่สามารถเปิดรายการได้" }}
      </section>
    }`,
})
export class Detail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(Api);
  readonly auth = inject(Auth);
  readonly feedback = inject(Feedback);
  private readonly route = inject(ActivatedRoute);
  readonly id = Number(this.route.snapshot.paramMap.get("id"));
  readonly row = signal<Barcode | null>(null);
  readonly openSignature = this.route.snapshot.fragment === "signature";
  readonly loading = signal(false);
  readonly busy = signal("");
  readonly upload = signal<File | null>(null);
  confirmed = false;
  private uploadKey = crypto.randomUUID();
  readonly historicalFile = signal<DocumentFile | null>(null);
  readonly activeSigned = computed(
    () =>
      this.row()?.files.find((f) => f.fileType === "signed" && f.isActive) ||
      null,
  );
  readonly generatedFile = computed(
    () =>
      this.row()?.files.find((f) => f.fileType === "generated" && f.isActive) ||
      null,
  );
  readonly history = computed(
    () =>
      this.row()?.files.filter((f) => !f.isActive && f.fileType === "signed") ||
      [],
  );
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (row) => {
          this.row.set(row);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.feedback.error(error, () => this.load());
        },
      });
  }
  generate() {
    if (this.busy() || !this.row()) return;
    this.performGenerate(structuredClone(this.row()!), crypto.randomUUID());
  }
  private performGenerate(row: Barcode, key: string) {
    if (this.busy()) return;
    this.busy.set("generate");
    this.feedback.working(
      "กำลังสร้าง Barcode",
      "เอกสารฉบับเดิมยังเปิดดูได้ระหว่างดำเนินการ",
    );
    this.api
      .generate(row, key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set("");
          this.upload.set(null);
          this.confirmed = false;
          this.feedback.success("สร้าง Barcode สำเร็จ");
          this.load();
        },
        error: (error) => {
          this.busy.set("");
          this.handleError(error, () => this.performGenerate(row, key));
        },
      });
  }
  chooseFile(event: Event) {
    this.feedback.clear();
    this.uploadKey = crypto.randomUUID();
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.confirmed = false;
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
  sendSigned() {
    const file = this.upload();
    if (this.busy() || !file || !this.generatedFile() || !this.confirmed)
      return;
    this.performUpload(file, this.uploadKey, this.generatedFile()!.uuid);
  }
  private performUpload(file: File, key: string, generatedFileUuid: string) {
    if (this.busy()) return;
    this.busy.set("signed");
    this.feedback.working("กำลังอัปโหลดใบลายมือชื่อ");
    this.api
      .signed(this.id, file, key, generatedFileUuid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set("");
          this.upload.set(null);
          this.confirmed = false;
          this.feedback.success("อัปโหลดใบลายมือชื่อสำเร็จ");
          this.load();
        },
        error: (error) => {
          this.busy.set("");
          this.handleError(error, () =>
            this.performUpload(file, key, generatedFileUuid),
          );
        },
      });
  }
  private handleError(error: { status?: number }, retry: () => void) {
    if (error.status === 409) {
      this.upload.set(null);
      this.confirmed = false;
      this.load();
      this.feedback.error({
        error: {
          message:
            "เอกสารเปลี่ยนแปลงแล้ว กรุณาตรวจสอบข้อมูลล่าสุดและเลือกไฟล์อีกครั้ง",
        },
      });
      return;
    }
    this.feedback.error(error, retry);
  }
}
