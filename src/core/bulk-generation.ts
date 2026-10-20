import { Injectable, inject, signal } from "@angular/core";
import { Subscription, exhaustMap, timer } from "rxjs";
import { Api } from "./api";
import { Feedback } from "../shared/feedback";
import { BulkProgress } from "./models";

@Injectable({ providedIn: "root" })
export class BulkGeneration {
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  readonly job = signal<BulkProgress | null>(null);
  readonly busy = signal(false);
  readonly pollError = signal(false);
  private poll?: Subscription;
  private request?: Subscription;
  private key = "";
  private ids?: number[];
  constructor() {
    window.addEventListener("barcode-session-cleared", () => {
      this.poll?.unsubscribe();
      this.request?.unsubscribe();
      this.job.set(null);
      this.busy.set(false);
      this.pollError.set(false);
      this.key = "";
      this.ids = undefined;
      sessionStorage.removeItem("barcode-generation-job");
    });
  }
  restore() {
    const id = sessionStorage.getItem("barcode-generation-job");
    if (id && !this.job() && !this.busy()) this.watch(id);
  }
  start(ids?: number[]) {
    if (
      this.busy() ||
      this.job()?.status === "running" ||
      this.job()?.status === "queued"
    )
      return;
    this.key = crypto.randomUUID();
    this.ids = ids;
    this.submit();
  }
  private submit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.feedback.clear();
    this.request = this.api.startGeneration(this.ids, this.key).subscribe({
      next: (job) => {
        this.busy.set(false);
        this.job.set(job);
        sessionStorage.setItem("barcode-generation-job", job.id);
        this.watch(job.id);
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.error(
          e,
          () => this.submit(),
          "เริ่มสร้าง Barcode ไม่สำเร็จ",
        );
      },
    });
  }
  watch(id: string) {
    this.poll?.unsubscribe();
    this.pollError.set(false);
    this.poll = timer(0, 1500)
      .pipe(exhaustMap(() => this.api.generationJob(id)))
      .subscribe({
        next: (job) => {
          this.job.set(job);
          if (job.status === "completed") {
            this.poll?.unsubscribe();
            window.dispatchEvent(new Event("barcode-generation-completed"));
          }
        },
        error: (e) => {
          this.pollError.set(true);
          if (e.status === 404) {
            this.job.set(null);
            sessionStorage.removeItem("barcode-generation-job");
            this.feedback.error({
              error: {
                message:
                  "ไม่พบคิวงาน อาจมีการรีสตาร์ต API สามารถกดสร้างทั้งหมดอีกครั้ง ระบบจะเลือกเฉพาะรายการที่ยังไม่มีไฟล์",
              },
            });
          } else
            this.feedback.error(
              e,
              () => this.watch(id),
              "อ่านความคืบหน้าไม่สำเร็จ",
            );
        },
      });
  }
  retry() {
    const job = this.job();
    if (!job || this.busy() || job.status !== "completed" || !job.failed)
      return;
    this.busy.set(true);
    this.request = this.api.retryGeneration(job.id).subscribe({
      next: (j) => {
        this.busy.set(false);
        this.job.set(j);
        this.watch(j.id);
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.error(e, () => this.retry());
      },
    });
  }
  dismiss() {
    if (this.job()?.status !== "completed") return;
    this.poll?.unsubscribe();
    this.job.set(null);
    sessionStorage.removeItem("barcode-generation-job");
  }
}
