import { Routes } from "@angular/router";
import { authenticated } from "./core/auth";
import { Access, Landing } from "./features/access";
export const routes: Routes = [
  { path: "login", component: Access, data: { mode: "login" } },
  { path: "auth/callback", component: Access, data: { mode: "callback" } },
  { path: "home", component: Access, data: { mode: "callback" } },
  { path: "session-expired", component: Access, data: { mode: "expired" } },
  { path: "forbidden", redirectTo: "barcodes", pathMatch: "full" },
  {
    path: "",
    pathMatch: "full",
    component: Landing,
    canActivate: [authenticated],
  },
  {
    path: "overview",
    loadComponent: () => import("./features/workspace").then((m) => m.Overview),
    canActivate: [authenticated],
    data: { capability: "overview" },
  },
  {
    path: "barcodes/new",
    loadComponent: () => import("./features/editor").then((m) => m.Editor),
    canActivate: [authenticated],
    data: { capability: "create" },
  },
  {
    path: "barcodes/:id/edit",
    loadComponent: () => import("./features/editor").then((m) => m.Editor),
    canActivate: [authenticated],
    data: { capability: "edit" },
  },
  {
    path: "barcodes/:id/document",
    loadComponent: () => import("./features/detail").then((m) => m.Detail),
    canActivate: [authenticated],
  },
  {
    path: "barcodes/:id",
    loadComponent: () => import("./features/detail").then((m) => m.Detail),
    canActivate: [authenticated],
  },
  {
    path: "barcodes",
    loadComponent: () => import("./features/list").then((m) => m.List),
    canActivate: [authenticated],
  },
  {
    path: "signatures",
    loadComponent: () => import("./features/list").then((m) => m.List),
    canActivate: [authenticated],
    data: { signed: true },
  },
  {
    path: "import",
    loadComponent: () => import("./features/import").then((m) => m.ImportPage),
    canActivate: [authenticated],
    data: { capability: "import" },
  },
  {
    path: "branches/new",
    loadComponent: () => import("./features/workspace").then((m) => m.Branches),
    canActivate: [authenticated],
    data: { capability: "manageBranches", editing: true },
  },
  {
    path: "branches/:id/edit",
    loadComponent: () => import("./features/workspace").then((m) => m.Branches),
    canActivate: [authenticated],
    data: { capability: "manageBranches", editing: true },
  },
  {
    path: "branches/:id",
    loadComponent: () => import("./features/workspace").then((m) => m.Branches),
    canActivate: [authenticated],
    data: { capability: "manageBranches" },
  },
  {
    path: "branches",
    loadComponent: () => import("./features/workspace").then((m) => m.Branches),
    canActivate: [authenticated],
    data: { capability: "manageBranches" },
  },
  {
    path: "history",
    loadComponent: () => import("./features/workspace").then((m) => m.History),
    canActivate: [authenticated],
    data: { capability: "audit" },
  },
  {
    path: "manual",
    loadComponent: () => import("./features/workspace").then((m) => m.Manual),
    canActivate: [authenticated],
  },
  { path: "**", component: Access, data: { mode: "missing" } },
];
