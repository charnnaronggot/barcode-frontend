import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ButtonModule } from "primeng/button";
import { Api } from "../core/api";
import { DocumentFile } from "../core/models";
import { Feedback } from "./feedback";
@Component({
  selector: "document-viewer",
  imports: [ButtonModule],
  template: ` <section class="document-viewer">
    <h2>{{ title() }}</h2>
    <div class="viewer-toolbar">
      @if (url()) {
        <a
          [href]="url()"
          [download]="file()?.originalName || 'document.pdf'"
          class="button secondary"
          >ดาวน์โหลด{{ title() }}</a
        >
      } @else {
        <button class="button secondary" disabled>
          ดาวน์โหลด{{ title() }}
        </button>
      }
    </div>
    <div class="document-canvas">
      @if (loading()) {
        <div class="empty"><span class="spinner"></span> กำลังโหลดเอกสาร…</div>
      } @else if (file() && safeUrl()) {
        @if (file()?.contentType?.startsWith("image/")) {
          <img class="document-image" [src]="url()" alt="ใบลายมือชื่อ" />
        } @else {
          <iframe [title]="title() + ' PDF'" [src]="safeUrl()"></iframe>
        }
      } @else {
        <div class="empty">
          <strong>{{
            file() ? "ไม่สามารถเปิดเอกสารได้" : "ยังไม่มี" + title()
          }}</strong>
          <p>{{ emptyMessage() }}</p>
        </div>
      }
    </div>
    <p class="document-caption">
      {{
        file()
          ? (file()?.originalName || title() + ".pdf") +
            (caption() ? " • " + caption() : "")
          : caption()
      }}
    </p>
  </section>`,
})
export class DocumentViewer {
  readonly title = input("ใบ Barcode");
  readonly emptyMessage = input("");
  readonly caption = input("");
  readonly file = input<DocumentFile | null>(null);
  readonly url = signal("");
  readonly safeUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal(false);
  private readonly api = inject(Api);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly feedback = inject(Feedback);
  constructor() {
    let epoch = 0;
    const clear = () => {
      if (this.url()) URL.revokeObjectURL(this.url());
      this.url.set("");
      this.safeUrl.set(null);
    };
    const clearSession = () => {
      epoch++;
      clear();
    };
    window.addEventListener("barcode-session-cleared", clearSession);
    inject(DestroyRef).onDestroy(() => {
      epoch++;
      clear();
      window.removeEventListener("barcode-session-cleared", clearSession);
    });
    effect((onCleanup) => {
      const file = this.file();
      untracked(clear);
      if (!file) {
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      const requestEpoch = epoch;
      const subscription = this.api.file(file.uuid).subscribe({
        next: (blob) => {
          if (requestEpoch !== epoch) return;
          const url = URL.createObjectURL(blob);
          this.url.set(url);
          this.safeUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(
              url + "#toolbar=0&navpanes=0&view=FitH",
            ),
          );
          this.loading.set(false);
        },
        error: (error) => {
          if (requestEpoch !== epoch) return;
          this.loading.set(false);
          this.feedback.error(error);
        },
      });
      onCleanup(() => {
        subscription.unsubscribe();
        untracked(clear);
      });
    });
  }
}
