import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideRouter } from "@angular/router";
import { provideAuth } from "angular-auth-oidc-client";
import { providePrimeNG } from "primeng/config";
import { BarcodeTheme } from "./core/theme";
import { App } from "./app";
import { routes } from "./routes";
import { CONFIG, RuntimeConfig } from "./core/config";
import { bearer } from "./core/auth";
async function start() {
  const response = await fetch("/config.json", { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      "กรุณาจัดเตรียม config.json สำหรับ Keycloak และ API ตามคู่มือ",
    );
  const config = (await response.json()) as RuntimeConfig;
  if (
    !config.clientId ||
    config.clientId.includes("<") ||
    !config.authority.startsWith("https://")
  )
    throw new Error(
      "กรุณาระบุ Keycloak public client ที่ได้รับการจัดเตรียมแล้ว",
    );
  for (const value of [config.redirectUrl, config.postLogoutRedirectUri])
    if (new URL(value).origin !== location.origin)
      throw new Error("Callback และ logout URL ต้องตรงกับโดเมนเว็บไซต์");
  for (const endpoint of [
    config.commandApi,
    config.queryApi,
    config.reportApi,
  ]) {
    if (!endpoint)
      throw new Error(
        "กรุณาระบุ commandApi, queryApi และ reportApi ใน config.json",
      );
    const apiUrl = new URL(endpoint, location.origin);
    if (
      apiUrl.protocol !== "https:" &&
      !(
        apiUrl.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(apiUrl.hostname)
      )
    )
      throw new Error("API ต้องใช้ HTTPS");
  }
  await bootstrapApplication(App, {
    providers: [
      { provide: CONFIG, useValue: config },
      provideHttpClient(withInterceptors([bearer])),
      provideRouter(routes),
      providePrimeNG({
        theme: { preset: BarcodeTheme, options: { darkModeSelector: false } },
      }),
      provideAuth({
        config: {
          configId: "internal",
          authority: config.authority,
          clientId: config.clientId,
          redirectUrl: config.redirectUrl,
          postLogoutRedirectUri: config.postLogoutRedirectUri,
          scope: config.scope,
          responseType: "code",
          silentRenew: true,
          useRefreshToken: true,
          ignoreNonceAfterRefresh: true,
          triggerRefreshWhenIdTokenExpired: false,
          secureRoutes: [],
        },
      }),
    ],
  });
}
void start().catch((error) => {
  const root = document.querySelector("app-root");
  if (root) root.textContent = error.message;
});
