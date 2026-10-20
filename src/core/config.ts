import { InjectionToken } from "@angular/core";
export interface RuntimeConfig {
  commandApi: string;
  queryApi: string;
  reportApi: string;
  authority: string;
  clientId: string;
  redirectUrl: string;
  postLogoutRedirectUri: string;
  scope: string;
}
export const CONFIG = new InjectionToken<RuntimeConfig>(
  "runtime configuration",
);
