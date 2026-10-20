import { DestroyRef, inject, Injectable, signal } from "@angular/core";
import { HttpInterceptorFn } from "@angular/common/http";
import { CanActivateFn, Router } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { catchError, firstValueFrom, switchMap, throwError } from "rxjs";
import { Api } from "./api";
import { CONFIG } from "./config";
import { Capabilities, Session } from "./models";
import { Feedback } from "../shared/feedback";
import {
  INITIAL_SESSION_REQUEST,
  LoginFailure,
  loginFailure,
} from "./login-failure";
@Injectable({ providedIn: "root" })
export class Auth {
  private readonly oidc = inject(OidcSecurityService);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly session = signal<Session | null>(null);
  readonly failure = signal<LoginFailure | null>(null);
  private pending?: Promise<void>;
  private epoch = 0;
  constructor() {
    const clearSession = (event: Event) => {
      const failure =
        (event as CustomEvent<{ failure?: LoginFailure }>).detail?.failure ||
        null;
      this.session.set(null);
      this.failure.set(failure);
      this.pending = failure ? Promise.resolve() : undefined;
      this.epoch++;
    };
    window.addEventListener("barcode-session-cleared", clearSession);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener("barcode-session-cleared", clearSession),
    );
  }
  initialize() {
    const epoch = this.epoch;
    return (this.pending ??= firstValueFrom(
      this.oidc.checkAuth(undefined, "internal"),
    )
      .then(async (result) => {
        if (result.isAuthenticated && epoch === this.epoch) {
          const session = await firstValueFrom(this.api.session());
          if (epoch === this.epoch) {
            this.failure.set(null);
            this.session.set(session);
          }
        } else if (result.errorMessage && epoch === this.epoch)
          this.rejectLogin({});
      })
      .catch((error) => {
        if (epoch === this.epoch) this.rejectLogin(error);
      }));
  }
  private rejectLogin(error: unknown) {
    window.dispatchEvent(
      new CustomEvent("barcode-session-cleared", {
        detail: { failure: loginFailure(error) },
      }),
    );
  }
  login() {
    this.clear();
    this.oidc.authorize("internal");
  }
  clear() {
    this.session.set(null);
    this.pending = undefined;
    window.dispatchEvent(new Event("barcode-session-cleared"));
  }
  logout() {
    this.clear();
    this.oidc
      .logoff("internal")
      .subscribe({ error: () => this.router.navigateByUrl("/login") });
  }
}
export const authenticated: CanActivateFn = async (route) => {
  const auth = inject(Auth),
    router = inject(Router),
    feedback = inject(Feedback);
  await auth.initialize();
  const session = auth.session();
  if (!session) return router.parseUrl("/login");
  const capability = route.data["capability"] as keyof Capabilities | undefined;
  if (!capability || session.capabilities[capability]) return true;
  feedback.afterNavigation({ status: 403 }, "ไม่มีสิทธิ์เปิดหน้านี้");
  return router.parseUrl("/barcodes");
};
export const bearer: HttpInterceptorFn = (request, next) => {
  const config = inject(CONFIG),
    oidc = inject(OidcSecurityService),
    router = inject(Router);
  const target = new URL(request.url, location.origin);
  const own = [config.commandApi, config.queryApi, config.reportApi].some(
    (endpoint) => {
      const base = new URL(endpoint, location.origin),
        prefix = base.pathname.replace(/\/$/, "");
      return (
        target.origin === base.origin &&
        (target.pathname.startsWith(prefix + "/api/") ||
          target.pathname === prefix + "/Barcode" ||
          target.pathname.startsWith(prefix + "/Barcode/"))
      );
    },
  );
  if (!own) return next(request);
  return oidc.getAccessToken("internal").pipe(
    switchMap((token) =>
      next(
        token
          ? request.clone({ setHeaders: { Authorization: "Bearer " + token } })
          : request,
      ),
    ),
    catchError((error) => {
      if (
        error.status === 401 &&
        !request.context.get(INITIAL_SESSION_REQUEST)
      ) {
        window.dispatchEvent(
          new CustomEvent("barcode-session-cleared", {
            detail: { failure: loginFailure(error) },
          }),
        );
        void router.navigateByUrl(
          error.error?.code === "token_expired" ? "/session-expired" : "/login",
        );
      }
      return throwError(() => error);
    }),
  );
};
