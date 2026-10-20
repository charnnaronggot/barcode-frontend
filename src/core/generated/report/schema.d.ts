export interface paths {
  "/api/barcodes/{id}/generate": {
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
            draftVersion?: string;
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
  "/api/barcodes/branches/{branchId}/merged": {
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
          branchId: number;
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
  "/api/files/{uuid}": {
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
          uuid: string;
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
  "/api/barcodes/generation-jobs": {
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
          "application/json": components["schemas"]["BulkRequest"];
          "text/json": components["schemas"]["BulkRequest"];
          "application/*+json": components["schemas"]["BulkRequest"];
        };
      };
      responses: {
        /** @description Accepted */
        202: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BulkProgress"];
            "application/json": components["schemas"]["BulkProgress"];
            "text/json": components["schemas"]["BulkProgress"];
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
  "/api/barcodes/generation-jobs/{id}": {
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
          id: string;
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
            "text/plain": components["schemas"]["BulkProgress"];
            "application/json": components["schemas"]["BulkProgress"];
            "text/json": components["schemas"]["BulkProgress"];
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
  "/api/barcodes/generation-jobs/{id}/retry": {
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
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Accepted */
        202: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/plain": components["schemas"]["BulkProgress"];
            "application/json": components["schemas"]["BulkProgress"];
            "text/json": components["schemas"]["BulkProgress"];
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
  "/Barcode": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          compCode?: string;
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
            "application/octet-stream": components["schemas"]["FileContentResult"];
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
  "/Barcode/by-id": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          compCode?: string;
          id?: number | string;
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
            "application/octet-stream": components["schemas"]["FileContentResult"];
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
  "/Barcode/generate-pdf": {
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
            csvFile: components["schemas"]["IFormFile"];
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
            "application/octet-stream": components["schemas"]["FileContentResult"];
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
  "/Barcode/preview-form": {
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
            PdfFile: components["schemas"]["IFormFile"];
            Data: components["schemas"]["IFormFile"];
            /** Format: int16 */
            FontSize: number | string;
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
            "application/octet-stream": components["schemas"]["FileContentResult"];
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
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    BulkFailure: {
      /** Format: int32 */
      id: number | string;
      message: string;
    };
    BulkProgress: {
      /** Format: uuid */
      id: string;
      status: string;
      /** Format: int32 */
      total: number | string;
      /** Format: int32 */
      succeeded: number | string;
      /** Format: int32 */
      skipped: number | string;
      /** Format: int32 */
      failed: number | string;
      errors: components["schemas"]["BulkFailure"][];
    };
    BulkRequest: {
      ids: null | (number | string)[];
    };
    EntityTagHeaderValue: {
      tag: components["schemas"]["StringSegment"];
      isWeak: boolean;
    };
    FileContentResult: {
      /** Format: byte */
      fileContents: string;
      contentType: null | string;
      fileDownloadName: null | string;
      /** Format: date-time */
      lastModified: null | string;
      entityTag: null | components["schemas"]["EntityTagHeaderValue"];
      enableRangeProcessing: boolean;
    };
    /** Format: binary */
    IFormFile: string;
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
    StringSegment: {
      buffer: null | string;
      /** Format: int32 */
      offset: number | string;
      /** Format: int32 */
      length: number | string;
      value: null | string;
      hasValue: boolean;
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
