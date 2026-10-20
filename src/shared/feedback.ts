import { Injectable, signal } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
export interface Notice {
  kind: "loading" | "success" | "error";
  title: string;
  message: string;
  retry?: () => void;
  actions?: { label: string; run: () => void }[];
}
@Injectable({ providedIn: "root" })
export class Feedback {
  readonly notice = signal<Notice | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  private deferredError: { error: unknown; title: string } | null = null;
  constructor() {
    window.addEventListener("barcode-session-cleared", () => {
      this.deferredError = null;
      this.clear();
    });
  }
  afterNavigation(error: unknown, title = "ดำเนินการไม่สำเร็จ") {
    this.deferredError = { error, title };
  }
  showAfterNavigation() {
    const pending = this.deferredError;
    this.deferredError = null;
    if (pending) this.error(pending.error, undefined, pending.title);
  }
  clear() {
    clearTimeout(this.timer);
    this.notice.set(null);
  }
  working(title: string, message = "กรุณารอสักครู่ ระบบกำลังดำเนินการ") {
    this.clear();
    this.notice.set({ kind: "loading", title, message });
  }
  choice(
    title: string,
    message: string,
    actions: NonNullable<Notice["actions"]>,
  ) {
    this.clear();
    this.notice.set({ kind: "success", title, message, actions });
  }
  success(title: string, message = "ดำเนินการเรียบร้อยแล้ว") {
    this.clear();
    const value: Notice = { kind: "success", title, message };
    this.notice.set(value);
    this.timer = setTimeout(() => {
      if (this.notice() === value) this.notice.set(null);
    }, 6000);
  }
  error(error: unknown, retry?: () => void, title = "ดำเนินการไม่สำเร็จ") {
    this.clear();
    const http = error as HttpErrorResponse;
    this.notice.set({
      kind: "error",
      title,
      message:
        typeof http.error?.message === "string"
          ? http.error.message
          : http.status === 409
            ? "ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดรายการใหม่"
            : http.status === 403
              ? "คุณไม่มีสิทธิ์ดำเนินการนี้"
              : "ไม่สามารถติดต่อระบบได้ กรุณาลองอีกครั้ง",
      retry,
    });
  }
}
