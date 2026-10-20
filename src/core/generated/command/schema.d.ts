export interface paths {
  "/api/barcodes": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["BarcodeInput"];
          "text/json": components["schemas"]["BarcodeInput"];
          "application/*+json": components["schemas"]["BarcodeInput"];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["MutationResult"];
            "application/json": components["schemas"]["MutationResult"];
            "text/json": components["schemas"]["MutationResult"];
          };
        };
      };
    };
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
    get?: never;
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: number;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["DraftUpdate"];
          "text/json": components["schemas"]["DraftUpdate"];
          "application/*+json": components["schemas"]["DraftUpdate"];
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["MutationResult"];
            "application/json": components["schemas"]["MutationResult"];
            "text/json": components["schemas"]["MutationResult"];
          };
        };
      };
    };
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/barcodes/import": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/x-www-form-urlencoded": {
            ContentType?: string;
            ContentDisposition?: string;
            Headers?: {
              [key: string]: string[];
            };
            /** Format: int64 */
            Length?: number | string;
            Name?: string;
            FileName?: string;
          } & {
            mapping?: string;
          } & {
            /**
             * Format: int32
             * @default 0
             */
            sheet?: number | string;
          };
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["MutationResult"];
            "application/json": components["schemas"]["MutationResult"];
            "text/json": components["schemas"]["MutationResult"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/barcodes/import/preview": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/x-www-form-urlencoded": {
            ContentType?: string;
            ContentDisposition?: string;
            Headers?: {
              [key: string]: string[];
            };
            /** Format: int64 */
            Length?: number | string;
            Name?: string;
            FileName?: string;
          } & {
            mapping?: string;
          } & {
            /** Format: int32 */
            sheet?: number | string;
          };
        };
      };
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["ImportPreview"];
            "application/json": components["schemas"]["ImportPreview"];
            "text/json": components["schemas"]["ImportPreview"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/barcodes/{id}/signed": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: number;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/x-www-form-urlencoded": {
            ContentType?: string;
            ContentDisposition?: string;
            Headers?: {
              [key: string]: string[];
            };
            /** Format: int64 */
            Length?: number | string;
            Name?: string;
            FileName?: string;
          } & {
            /** Format: uuid */
            generatedFileUuid?: string;
          };
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["MutationResult"];
            "application/json": components["schemas"]["MutationResult"];
            "text/json": components["schemas"]["MutationResult"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/branches/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: number;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["BranchUpdate"];
          "text/json": components["schemas"]["BranchUpdate"];
          "application/*+json": components["schemas"]["BranchUpdate"];
        };
      };
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
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/Barcode/approve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "multipart/form-data": {
            Data: components["schemas"]["IFormFile"];
          };
        };
      };
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
    BarcodeInput: {
      /** Format: int32 */
      id?: null | number | string;
      /** Format: int32 */
      branchId?: number | string;
      comp: string;
      tax: string;
      suffix: string;
      ref1: string;
      ref2?: null | string;
      ref3?: null | string;
      textLevel1: string;
      textLevel2: string;
      textLevel3: string;
      /** Format: double */
      amount?: null | number | string;
    };
    BranchUpdate: {
      name: string;
      isActive: boolean;
    };
    DraftUpdate: {
      data: components["schemas"]["BarcodeInput"];
      rowVersion: string;
    };
    /** Format: binary */
    IFormFile: string;
    ImportError: {
      /** Format: int32 */
      row: number | string;
      column: string;
      message: string;
    };
    ImportPreview: {
      sheets: string[];
      /** Format: int32 */
      sheet: number | string;
      headers: string[];
      sample: string[][];
      /** Format: int32 */
      count: number | string;
      errors: components["schemas"]["ImportError"][];
    };
    MutationResult: {
      /** Format: int32 */
      id: null | number | string;
      /** Format: int32 */
      branchId: null | number | string;
      /** Format: uuid */
      uuid: null | string;
      fileType: null | string;
      /** Format: int32 */
      count: null | number | string;
      ids: null | (number | string)[];
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
