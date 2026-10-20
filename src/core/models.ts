import { components as QueryComponents } from "./generated/query/schema";
import { components as CommandComponents } from "./generated/command/schema";
import { components as ReportComponents } from "./generated/report/schema";
// ASP.NET's input schema permits numeric strings. Responses use JSON numbers.
type Wire<T> = number extends T
  ? Exclude<T, string>
  : T extends readonly unknown[]
    ? Wire<T[number]>[]
    : T extends object
      ? { [K in keyof T]: Wire<T[K]> }
      : T;
type Schema<K extends keyof QueryComponents["schemas"]> = Wire<
  QueryComponents["schemas"][K]
>;
export type Capabilities = Schema<"Capabilities">;
export type Session = Schema<"SessionView">;
export type BarcodeInput = Omit<
  Wire<CommandComponents["schemas"]["BarcodeInput"]>,
  "id"
> & { id?: number | null };
export type DocumentFile = Schema<"DocumentFileView">;
export type Barcode = Schema<"BarcodeView">;
export type Branch = Schema<"BranchView">;
export type Mutation = Wire<CommandComponents["schemas"]["MutationResult"]>;
export type ImportError = Wire<CommandComponents["schemas"]["ImportError"]>;
export type ImportPreview = Wire<CommandComponents["schemas"]["ImportPreview"]>;
export type Audit = Schema<"BarcodeAudit">;
export type Summary = Schema<"SummaryView">;
export type BulkProgress = Wire<ReportComponents["schemas"]["BulkProgress"]>;
