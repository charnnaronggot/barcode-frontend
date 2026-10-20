// Browser fixture entry point. Only included by the "visual" build configuration.
// Production main.ts always uses real OIDC and the real API.
import { bootstrapApplication } from "@angular/platform-browser";
import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { of } from "rxjs";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { providePrimeNG } from "primeng/config";
import { BarcodeTheme } from "../src/core/theme";
import { App } from "../src/app";
import { routes } from "../src/routes";
import { Auth, bearer } from "../src/core/auth";
import { CONFIG } from "../src/core/config";
import { Session } from "../src/core/models";
const role = new URLSearchParams(location.search).get("role") || "branch";
const hq = role === "hq";
const session = signal<Session | null>(
  role === "anonymous"
    ? null
    : {
        issuer: "https://identity.test/realms/internal",
        subject: hq ? "hq-user" : "branch-101",
        name: hq ? "เจ้าหน้าที่สำนักงานใหญ่" : "เจ้าหน้าที่สาขา",
        isHq: hq,
        branchId: hq ? null : 101,
        branchName: hq ? "สำนักงานใหญ่" : "สาขากรุงเทพ",
        capabilities: {
          overview: hq,
          create: hq,
          edit: hq,
          import: hq,
          generate: hq,
          manageBranches: hq,
          audit: hq,
          uploadSigned: hq,
        },
      },
);
const auth = {
  session,
  failure: signal(null),
  initialize: () => Promise.resolve(),
  login: () => {},
  clear: () => {
    session.set(null);
    window.dispatchEvent(new Event("barcode-session-cleared"));
  },
  logout: () => {
    session.set(null);
    window.dispatchEvent(new Event("barcode-session-cleared"));
    location.assign("/login?role=anonymous");
  },
};
const authProviders = role.startsWith("login-")
  ? []
  : [{ provide: Auth, useValue: auth }];
const oidc = {
  getAccessToken: () => of("visual-test-token"),
  checkAuth: () =>
    of({
      isAuthenticated: true,
      userData: {},
      accessToken: "visual-test-token",
      idToken: "visual-id-token",
    }),
  authorize: () => {},
  logoff: () => of({}),
};
void bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([bearer])),
    providePrimeNG({
      theme: { preset: BarcodeTheme, options: { darkModeSelector: false } },
    }),
    {
      provide: CONFIG,
      useValue: {
        commandApi: "/command",
        queryApi: "/query",
        reportApi: "/report",
      },
    },
    ...authProviders,
    { provide: OidcSecurityService, useValue: oidc },
  ],
});
