import { Feedback } from "./feedback";
describe("operation notices", () => {
  it("only reports success after explicit API completion and preserves retry", () => {
    const feedback = new Feedback();
    const retry = vi.fn();
    feedback.working("กำลังสร้าง Barcode");
    expect(feedback.notice()?.kind).toBe("loading");
    feedback.error(
      { status: 500, error: { message: "สร้างไม่สำเร็จ" } },
      retry,
    );
    expect(feedback.notice()?.message).toBe("สร้างไม่สำเร็จ");
    feedback.notice()?.retry?.();
    expect(retry).toHaveBeenCalledOnce();
    feedback.success("สำเร็จ");
    expect(feedback.notice()?.kind).toBe("success");
    feedback.clear();
  });
  it("clears retry callbacks and operation data when the session ends", () => {
    const feedback = new Feedback();
    feedback.error({ status: 0 }, () => {});
    window.dispatchEvent(new Event("barcode-session-cleared"));
    expect(feedback.notice()).toBeNull();
  });
});
