import { TestBed } from "@angular/core/testing";
import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { OidcSecurityService } from "angular-auth-oidc-client";
import { of, throwError } from "rxjs";
import { Auth, bearer } from "./auth";
import { CONFIG } from "./config";
import { Api } from "./api";
import { INITIAL_SESSION_REQUEST } from "./login-failure";

describe("Bearer access to three API services", () => {
  let http: HttpClient, requests: HttpTestingController;
  const navigate = vi.fn().mockResolvedValue(true);
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bearer])),
        provideHttpClientTesting(),
        {
          provide: CONFIG,
          useValue: {
            commandApi: "https://command.test/command",
            queryApi: "https://query.test/query",
            reportApi: "https://report.test/report",
          },
        },
        {
          provide: OidcSecurityService,
          useValue: { getAccessToken: () => of("test-access-token") },
        },
        { provide: Router, useValue: { navigateByUrl: navigate } },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    navigate.mockClear();
  });
  afterEach(() => requests.verify());
  it("attaches the token to all configured services", () => {
    for (const service of ["command", "query", "report"]) {
      const url = "https://" + service + ".test/" + service + "/api/example";
      http.get(url).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.headers.get("Authorization")).toBe(
        "Bearer test-access-token",
      );
      request.flush({});
    }
  });
  it("does not leak the token to other origins or neighboring path prefixes", () => {
    for (const url of [
      "https://other.test/query/api/example",
      "https://query.test/query-other/api/example",
      "https://query.test/query/asset.png",
    ]) {
      http.get(url).subscribe();
      const request = requests.expectOne(url);
      expect(request.request.headers.has("Authorization")).toBe(false);
      request.flush({});
    }
  });
  it("clears the session on a service 401", () => {
    const cleared = vi.fn();
    window.addEventListener("barcode-session-cleared", cleared);
    try {
      const url = "https://query.test/query/api/session";
      http.get(url).subscribe({ error: () => {} });
      requests
        .expectOne(url)
        .flush(
          { code: "token_expired" },
          { status: 401, statusText: "Unauthorized" },
        );
      expect(cleared).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith("/session-expired");
    } finally {
      window.removeEventListener("barcode-session-cleared", cleared);
    }
  });
  it("does not navigate or clear the session while the initial API session is being checked", () => {
    const cleared = vi.fn();
    window.addEventListener("barcode-session-cleared", cleared);
    try {
      const url = "https://query.test/query/api/session";
      http
        .get(url, {
          context: new HttpContext().set(INITIAL_SESSION_REQUEST, true),
        })
        .subscribe({ error: () => {} });
      requests
        .expectOne(url)
        .flush(
          { code: "token_audience_mismatch" },
          { status: 401, statusText: "Unauthorized" },
        );
      expect(navigate).not.toHaveBeenCalled();
      expect(cleared).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("barcode-session-cleared", cleared);
    }
  });
  it("returns a rejected live token to login rather than calling it expired", () => {
    const url = "https://query.test/query/api/barcodes";
    http.get(url).subscribe({ error: () => {} });
    requests
      .expectOne(url)
      .flush(
        { code: "token_audience_mismatch" },
        { status: 401, statusText: "Unauthorized" },
      );
    expect(navigate).toHaveBeenCalledWith("/login");
  });
  it("does not log out an authenticated user for an authorization 403", () => {
    const url = "https://query.test/query/api/barcodes";
    http.get(url).subscribe({ error: () => {} });
    requests
      .expectOne(url)
      .flush(
        { code: "account_not_authorized" },
        { status: 403, statusText: "Forbidden" },
      );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("Initial application session failure", () => {
  const checkAuth = vi.fn(),
    session = vi.fn(),
    authorize = vi.fn();
  beforeEach(() => {
    checkAuth.mockReset().mockReturnValue(of({ isAuthenticated: true }));
    session.mockReset();
    authorize.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: OidcSecurityService, useValue: { checkAuth, authorize } },
        { provide: Api, useValue: { session } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
  });
  it("keeps the original audience failure and checks the OIDC callback only once", async () => {
    session.mockReturnValue(
      throwError(() => ({
        status: 401,
        error: { code: "token_audience_mismatch", traceId: "test-correlation" },
      })),
    );
    const auth = TestBed.inject(Auth);
    await auth.initialize();
    await auth.initialize();
    expect(auth.session()).toBeNull();
    expect(auth.failure()?.code).toBe("token_audience_mismatch");
    expect(auth.failure()?.traceId).toBe("test-correlation");
    expect(checkAuth).toHaveBeenCalledTimes(1);
    expect(session).toHaveBeenCalledTimes(1);
    auth.login();
    expect(auth.failure()).toBeNull();
    expect(authorize).toHaveBeenCalledWith("internal");
  });
  it("shows an account permission failure separately from token expiry", async () => {
    session.mockReturnValue(
      throwError(() => ({
        status: 403,
        error: { code: "account_not_authorized" },
      })),
    );
    const auth = TestBed.inject(Auth);
    await auth.initialize();
    expect(auth.failure()?.code).toBe("account_not_authorized");
  });
});
