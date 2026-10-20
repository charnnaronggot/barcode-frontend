import { Component, input } from "@angular/core";
@Component({
  selector: "doc-status",
  template: `<span [class]="'badge ' + value()">{{
    value() === "signed"
      ? "แนบใบเซ็นแล้ว"
      : value() === "unsigned"
        ? "รอแนบใบเซ็น"
        : "ยังไม่สร้าง Barcode"
  }}</span>`,
})
export class Status {
  readonly value = input.required<string>();
}
