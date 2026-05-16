import { describe, it, expect } from "vitest";
import { getNextScheduledDate } from "../firestore";

describe("getNextScheduledDate", () => {
  it("advances daily by 1 day", () => {
    expect(getNextScheduledDate("2026-05-15", "daily")).toBe("2026-05-16");
  });

  it("advances weekly by 7 days", () => {
    expect(getNextScheduledDate("2026-05-15", "weekly")).toBe("2026-05-22");
  });

  it("advances biweekly by 14 days", () => {
    expect(getNextScheduledDate("2026-05-15", "biweekly")).toBe("2026-05-29");
  });

  it("advances monthly by 1 month", () => {
    expect(getNextScheduledDate("2026-05-15", "monthly")).toBe("2026-06-15");
  });

  it("advances quarterly by 3 months", () => {
    expect(getNextScheduledDate("2026-05-15", "quarterly")).toBe("2026-08-15");
  });

  it("handles month boundary (daily from Jan 31)", () => {
    expect(getNextScheduledDate("2026-01-31", "daily")).toBe("2026-02-01");
  });

  it("handles year boundary (daily from Dec 31)", () => {
    expect(getNextScheduledDate("2026-12-31", "daily")).toBe("2027-01-01");
  });

  it("handles month overflow (monthly from Jan 31 → Feb 28)", () => {
    const result = getNextScheduledDate("2026-01-31", "monthly");
    expect(result).toBe("2026-03-03");
  });

  it("handles weekly across month boundary", () => {
    expect(getNextScheduledDate("2026-05-28", "weekly")).toBe("2026-06-04");
  });

  it("handles quarterly across year boundary", () => {
    expect(getNextScheduledDate("2026-11-15", "quarterly")).toBe("2027-02-15");
  });

  it("advances semiannually by 6 months", () => {
    expect(getNextScheduledDate("2026-05-15", "semiannually")).toBe("2026-11-15");
  });

  it("handles semiannually across year boundary", () => {
    expect(getNextScheduledDate("2026-09-15", "semiannually")).toBe("2027-03-15");
  });

  it("advances yearly by 1 year", () => {
    expect(getNextScheduledDate("2026-05-15", "yearly")).toBe("2027-05-15");
  });

  it("handles yearly on leap day", () => {
    expect(getNextScheduledDate("2024-02-29", "yearly")).toBe("2025-03-01");
  });
});
