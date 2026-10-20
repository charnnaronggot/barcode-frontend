import { Component, inject } from "@angular/core";
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";
import { ButtonModule } from "primeng/button";
import { Auth } from "./core/auth";
import { Feedback } from "./shared/feedback";
import { BulkGenerationPanel } from "./shared/bulk-generation-panel";
@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    BulkGenerationPanel,
  ],
  template: ` @if (auth.session(); as session) {
      <div class="workspace">
        <aside class="sidebar">
          <a class="brand" routerLink="/"
            ><span class="brand-mark"
              ><img
                src="/assets/brand.svg"
                alt=""
                width="24"
                height="24" /></span
            >FBI open up</a
          >
          <small class="nav-caption">BARCODE WORKSPACE</small>
          <div class="project">
            <small>โครงการปัจจุบัน</small><strong>Barcode ปณ.</strong>
          </div>
          <nav aria-label="เมนูหลัก">
            <a routerLink="/barcodes" routerLinkActive="active"
              ><img src="/assets/barcode.svg" alt="" />รายการ Barcode</a
            >
            @if (session.capabilities.manageBranches) {
              <a routerLink="/branches" routerLinkActive="active"
                ><img src="/assets/branch.svg" alt="" />จัดการสาขา</a
              >
            }
          </nav>
          <div class="sidebar-bottom">
            <a routerLink="/manual">คู่มือการใช้งาน</a
            ><small>Workspace v1.0</small>
          </div>
        </aside>
        <div class="workspace-body">
          <header class="topbar">
            <div>
              <span class="muted">โครงการ ปณ.</span
              ><span class="separator">/</span>{{ pageName() }}
            </div>
            <div class="profile">
              <img src="/assets/bell.svg" alt="" width="20" height="20" /><span
                class="avatar"
                >{{ session.isHq ? "HQ" : "BR" }}</span
              ><span
                >{{ session.name }}<small>{{ session.branchName }}</small></span
              >
              <details class="account-menu">
                <summary aria-label="เมนูบัญชี">⌄</summary>
                <button (click)="auth.logout()">ออกจากระบบ</button>
              </details>
            </div>
          </header>
          <main><router-outlet /></main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
    @if (feedback.notice(); as notice) {
      <section
        [class]="'notice ' + notice.kind"
        role="status"
        aria-live="polite"
      >
        <span class="notice-icon" [class.spinner]="notice.kind === 'loading'">{{
          notice.kind === "loading" ? "" : notice.kind === "success" ? "✓" : "!"
        }}</span>
        <div>
          <strong>{{ notice.title }}</strong>
          <p>{{ notice.message }}</p>
          @if (notice.retry) {
            <p-button
              label="ลองใหม่"
              [text]="true"
              (onClick)="notice.retry()"
            />
          }
          @for (action of notice.actions; track action.label) {
            <p-button
              [label]="action.label"
              [text]="true"
              (onClick)="action.run()"
            />
          }
        </div>
        @if (notice.kind !== "loading") {
          <button
            class="icon-button"
            aria-label="ปิดข้อความ"
            (click)="feedback.clear()"
          >
            ×
          </button>
        }
      </section>
    }
    @if (auth.session()?.capabilities?.generate) {
      <app-bulk-generation />
    }`,
})
export class App {
  private readonly router = inject(Router);
  pageName() {
    const url = this.router.url.split("?")[0];
    if (url === "/barcodes/new") return "สร้างรายการ Barcode";
    if (/^\/barcodes\/\d+\/edit$/.test(url)) return "แก้ไขข้อมูล Barcode";
    if (/^\/barcodes\/\d+(\/document)?$/.test(url))
      return "ใบ Barcode และใบลายมือชื่อ";
    if (url === "/branches/new" || /^\/branches\/\d+\/edit$/.test(url))
      return "เพิ่มหรือแก้ไขสาขา";
    if (/^\/branches\/\d+$/.test(url)) return "รายละเอียดสาขา";
    return url.includes("/branches")
      ? "จัดการสาขา"
      : url.includes("/import")
        ? "นำเข้าข้อมูล"
        : url.includes("/history")
          ? "ประวัติการทำงาน"
          : url.includes("/manual")
            ? "คู่มือการใช้งาน"
            : "รายการ Barcode";
  }
  readonly auth = inject(Auth);
  readonly feedback = inject(Feedback);
  constructor() {
    inject(Router)
      .events.pipe(
        filter(
          (event) =>
            event instanceof NavigationStart || event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) this.feedback.clear();
        else this.feedback.showAfterNavigation();
      });
  }
}
