import { HttpContextToken } from "@angular/common/http";

export const INITIAL_SESSION_REQUEST = new HttpContextToken(() => false);
export interface LoginFailure {
  code: string;
  message: string;
  traceId?: string;
}

export function loginFailure(error: unknown): LoginFailure {
  const response = error as {
    status?: number;
    error?: { code?: string; traceId?: string };
  };
  const code =
    response?.error?.code ||
    (response?.status === 403
      ? "account_not_authorized"
      : response?.status === 401
        ? "token_rejected"
        : response?.status === 0
          ? "connection_failed"
          : "login_failed");
  const messages: Record<string, string> = {
    token_expired: "ข้อมูลยืนยันตัวตนหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
    token_audience_mismatch:
      "เข้าสู่ระบบ BAAC แล้ว แต่โทเคนไม่ได้รับอนุญาตสำหรับระบบ Barcode กรุณาติดต่อผู้ดูแลระบบ",
    token_issuer_mismatch:
      "ข้อมูลยืนยันตัวตนมาจากระบบที่ไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ",
    token_signature_invalid:
      "ระบบตรวจสอบข้อมูลยืนยันตัวตนไม่ผ่าน กรุณาเข้าสู่ระบบใหม่หรือติดต่อผู้ดูแลระบบ",
    token_missing: "ระบบยังไม่ได้รับข้อมูลยืนยันตัวตน กรุณาเข้าสู่ระบบอีกครั้ง",
    account_not_authorized:
      "บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน หรือข้อมูลพนักงานไม่ครบ กรุณาติดต่อผู้ดูแลระบบ",
    connection_failed:
      "ไม่สามารถเชื่อมต่อบริการเข้าสู่ระบบหรือ API ได้ กรุณาลองอีกครั้ง",
  };
  return {
    code,
    message:
      messages[code] ||
      "ระบบไม่ยอมรับการเข้าสู่ระบบ กรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ",
    traceId: response?.error?.traceId,
  };
}
