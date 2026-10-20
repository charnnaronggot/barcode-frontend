export interface paths {
  "/api/barcodes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          branchId?: number | string;
          search?: string;
          status?: string;
          page?: number | string;
          pageSize?: number | string;
          barcodeStatus?: string;
          signatureStatus?: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BarcodeView"][];
            "application/json": components["schemas"]["BarcodeView"][];
            "text/json": components["schemas"]["BarcodeView"][];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/barcodes/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: number;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BarcodeView"];
            "application/json": components["schemas"]["BarcodeView"];
            "text/json": components["schemas"]["BarcodeView"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/session": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["SessionView"];
            "application/json": components["schemas"]["SessionView"];
            "text/json": components["schemas"]["SessionView"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/barcodes/summary": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["SummaryView"];
            "application/json": components["schemas"]["SummaryView"];
            "text/json": components["schemas"]["SummaryView"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/branches": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BranchView"][];
            "application/json": components["schemas"]["BranchView"][];
            "text/json": components["schemas"]["BranchView"][];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/audit-logs": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          barcodeId?: number | string;
          branchId?: number | string;
          page?: number | string;
          pageSize?: number | string;
          search?: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BarcodeAudit"][];
            "application/json": components["schemas"]["BarcodeAudit"][];
            "text/json": components["schemas"]["BarcodeAudit"][];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/Barcode/count": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    BarcodeAudit: {
      /** Format: int64 */
      id: number | string;
      /** Format: int32 */
      barcodeId: null | number | string;
      /** Format: int32 */
      branchId: null | number | string;
      action: string;
      actorIssuer: string;
      actorSubject: string;
      /** Format: date-time */
      createdUtc: string;
      detailsJson: string;
    };
    BarcodeView: {
      /** Format: int32 */
      id: number | string;
      /** Format: int32 */
      branchId: number | string;
      branchName: string;
      comp: string;
      tax: string;
      suffix: string;
      ref1: string;
      ref2: null | string;
      ref3: null | string;
      textLevel1: string;
      textLevel2: string;
      textLevel3: string;
      /** Format: double */
      amount: null | number | string;
      rowVersion: string;
      /** Format: date-time */
      updatedUtc: null | string;
      hasGeneratedPdf: boolean;
      hasSignedFile: boolean;
      status: string;
      files: components["schemas"]["DocumentFileView"][];
      /** Format: date-time */
      createdUtc?: null | string;
    };
    BranchView: {
      /** Format: int32 */
      id: number | string;
      name: null | string;
      isActive: boolean;
      /** Format: int32 */
      count: number | string;
    };
    Capabilities: {
      overview: boolean;
      create: boolean;
      edit: boolean;
      import: boolean;
      generate: boolean;
      manageBranches: boolean;
      audit: boolean;
      uploadSigned: boolean;
    };
    DocumentFileView: {
      /** Format: uuid */
      uuid: string;
      fileType: string;
      isActive: boolean;
      contentType: string;
      originalName: null | string;
      /** Format: date-time */
      createdUtc: null | string;
      actorIssuer: null | string;
      actorSubject: null | string;
    };
    SessionView: {
      issuer: string;
      subject: string;
      name: string;
      isHq: boolean;
      /** Format: int32 */
      branchId: null | number | string;
      branchName: string;
      capabilities: components["schemas"]["Capabilities"];
    };
    SummaryView: {
      /** Format: int32 */
      total: number | string;
      /** Format: int32 */
      generated: number | string;
      /** Format: int32 */
      signed: number | string;
      /** Format: int32 */
      unsigned: number | string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
