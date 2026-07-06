import { describe, expect, it } from "vitest";
import { statusColor } from "./statusColor";

describe("statusColor", () => {
  it("waiting은 초록", () => {
    expect(statusColor("waiting")).toBe("#22c55e");
  });

  it("charging은 주황", () => {
    expect(statusColor("charging")).toBe("#f97316");
  });

  it("other는 회색", () => {
    expect(statusColor("other")).toBe("#9ca3af");
  });

  it("unknown도 방어적으로 회색", () => {
    expect(statusColor("unknown")).toBe("#9ca3af");
  });
});
