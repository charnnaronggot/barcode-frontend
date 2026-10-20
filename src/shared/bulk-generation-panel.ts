import { Component, inject, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { BulkGeneration } from "../core/bulk-generation";

@Component({
  selector: "app-bulk-generation",
  imports: [ButtonModule, RouterLink],
  template: ` @if (bulk.job(); as job) {
    <section
      class="bulk-progress"
      role="region"
      aria-label="ความคืบหน้าสร้าง Barcode"
    >
      <div class="section-heading">
        <strong>{{
          job.status === "completed"
            ? "สร้าง Barcode เสร็จแล้ว"
            : "กำลังสร้าง Barcode"
        }}</strong>
        @if (job.status === "completed") {
          <button
            class="icon-button"
            aria-label="ปิดความคืบหน้า"
            (click)="bulk.dismiss()"
          >
            ×
          </button>
        }
      </div>
      <p aria-live="polite">
        สำเร็จ {{ job.succeeded }} · มีไฟล์แล้ว {{ job.skipped }} · ไม่สำเร็จ
        {{ job.failed }} / {{ job.total }} รายการ
      </p>
      <progress
        [value]="
          job.succeeded +
          job.skipped +
          (job.status === 'completed' ? job.failed : 0)
        "
        [max]="job.total || 1"
        aria-label="จำนวนรายการที่ดำเนินการแล้ว"
      ></progress>
      @if (job.status !== "completed") {
        <small class="muted">เปลี่ยนหน้าได้ งานยังทำต่อในระบบ</small>
      }
      @if (bulk.pollError()) {
        <p>อ่านความคืบหน้าไม่ได้</p>
        <p-button
          label="ตรวจความคืบหน้าอีกครั้ง"
          [text]="true"
          (onClick)="bulk.watch(job.id)"
        />
      }
      @if (job.status === "completed" && job.failed) {
        <p-button
          label="ลองใหม่เฉพาะรายการที่ไม่สำเร็จ"
          [disabled]="bulk.busy()"
          (onClick)="bulk.retry()"
        />
        <details>
          <summary>รายการที่ไม่สำเร็จ ({{ job.failed }})</summary>
          <ul>
            @for (error of job.errors; track error.id) {
              <li>
                <a [routerLink]="['/barcodes', error.id, 'edit']">{{
                  error.id
                }}</a>
                — {{ error.message }}
              </li>
            }
          </ul>
        </details>
      }
    </section>
  }`,
})
export class BulkGenerationPanel implements OnInit {
  readonly bulk = inject(BulkGeneration);
  ngOnInit() {
    this.bulk.restore();
  }
}
