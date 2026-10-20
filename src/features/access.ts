import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { Auth } from "../core/auth";
@Component({
  imports: [ButtonModule, RouterLink],
  styleUrl: "./access.css",
  template: ` @if (mode === "login") {
      <section class="baac-login">
        <div class="login-blobs" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="login-orbs" aria-hidden="true">
          @for (orb of orbs; track $index) {
            <span
              [style.left.%]="orb.left"
              [style.top.%]="orb.top"
              [style.width.px]="orb.size"
              [style.height.px]="orb.size"
              [style.animation-delay.s]="orb.delay"
            ></span>
          }
        </div>
        <div class="baac-card">
          <header class="baac-header">
            <div class="baac-logo">
              <img
                src="/assets/baac-logo.png"
                alt="ธ.ก.ส."
                width="36"
                height="36"
              />
            </div>
            <h1>FBI open up</h1>
            <p>ระบบ Barcode · โครงการ ปณ.</p>
          </header>
          <div class="baac-content">
            <h2>เข้าสู่ระบบ</h2>
            <p>กรุณาเลือกช่องทางเข้าสู่ระบบ</p>
            @if (auth.failure(); as failure) {
              <div class="login-error" role="alert">
                <p>{{ failure.message }}</p>
                @if (failure.traceId) {
                  <small>รหัสอ้างอิง {{ failure.traceId }}</small>
                }
              </div>
            }
            <button type="button" class="baac-signin" (click)="auth.login()">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                /></svg
              ><span>เข้าสู่ระบบด้วย BAAC Account</span>
            </button>
            <div
              class="login-project disabled baac-partner"
              aria-disabled="true"
            >
              <span>โครงการพันธมิตร</span><small>เปิดใช้งานภายหลัง</small>
            </div>
          </div>
          <footer>ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร</footer>
        </div>
      </section>
    } @else {
      <div class="access">
        <section class="access-brand">
          <strong>FBI open up</strong>
          <div>
            <h1>Barcode.<br />One workspace.</h1>
            <p>
              จัดการข้อมูล ใบ Barcode และใบลายมือชื่อ<br />ในพื้นที่ทำงานเดียวกัน
            </p>
          </div>
          <small>โครงการ ปณ.</small>
        </section>
        <section class="access-content">
          @switch (mode) {
            @case ("callback") {
              <div class="spinner large"></div>
              <h1>กำลังเข้าสู่ระบบ</h1>
              <p>กำลังตรวจสอบข้อมูลบัญชีของคุณ</p>
            }
            @case ("expired") {
              <span class="access-symbol">↻</span>
              <h1>เซสชันหมดอายุ</h1>
              <p>กรุณาเข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ</p>
              <p-button label="เข้าสู่ระบบอีกครั้ง" (onClick)="auth.login()" />
            }
            @case ("missing") {
              <h1>ไม่พบหน้าที่ต้องการ</h1>
              <a routerLink="/">กลับพื้นที่ทำงาน</a>
            }
            @default {
              <div class="access-card">
                <span class="eyebrow">BARCODE WORKSPACE</span>
                <h1>เข้าสู่ระบบ</h1>
                <p class="muted">เลือกโครงการเพื่อเข้าสู่พื้นที่ทำงานของคุณ</p>
                <div class="login-project">
                  <span class="project-icon">ปณ.</span>
                  <div>
                    <h2>โครงการ ปณ.</h2>
                    <p>สำหรับพนักงานสำนักงานใหญ่และสาขา</p>
                  </div>
                </div>
                <p-button
                  label="เข้าสู่ระบบด้วยบัญชีพนักงาน"
                  (onClick)="auth.login()"
                  styleClass="full-width"
                />
                <div class="login-project disabled">
                  <span class="project-icon">↗</span>
                  <div>
                    <h2>โครงการพันธมิตร</h2>
                    <p>เปิดใช้งานภายหลัง</p>
                  </div>
                </div>
                <small class="muted"
                  >การเข้าใช้งานเป็นไปตามสิทธิ์ของบัญชีพนักงาน</small
                >
              </div>
            }
          }
        </section>
      </div>
    }`,
})
export class Access implements OnInit {
  readonly orbs = Array.from({ length: 8 }, (_, i) => ({
    left: (i * 37 + 9) % 94,
    top: (i * 23 + 12) % 90,
    size: 48 + i * 13,
    delay: -i * 2,
  }));
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = this.route.snapshot.data["mode"] as string;
  async ngOnInit() {
    if (this.mode === "expired") {
      this.auth.clear();
      return;
    }
    if (this.mode === "callback" || this.mode === "login") {
      await this.auth.initialize();
      if (this.auth.session()) await this.router.navigateByUrl("/");
      else if (this.mode === "callback")
        await this.router.navigateByUrl("/login", { replaceUrl: true });
    }
  }
}
@Component({ template: '<p class="muted">กำลังเปิดพื้นที่ทำงาน…</p>' })
export class Landing implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  ngOnInit() {
    void this.router.navigateByUrl("/barcodes");
  }
}
