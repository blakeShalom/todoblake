import { describe, expect, it } from "vitest";
import { getWeekStart } from "@/lib/utils";

describe("getWeekStart", () => {
  it("uses Monday as the start of the week", () => {
    expect(getWeekStart(new Date("2026-09-08T12:00:00"))).toBe("2026-09-07");
    expect(getWeekStart(new Date("2026-09-13T12:00:00"))).toBe("2026-09-07");
  });
});
