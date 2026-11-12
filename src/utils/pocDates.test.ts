import { describe, expect, it } from "vitest";
import { addDays, daysUntil, todayIsoDate } from "./pocDates";

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-11-01", 30)).toBe("2026-12-01");
  });
  it("rolls over month and year", () => {
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
  });
  it("handles leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
  it("returns empty string for invalid input", () => {
    expect(addDays("", 5)).toBe("");
    expect(addDays("11/01/2026", 5)).toBe("");
    expect(addDays("2026-11-01", NaN)).toBe("");
  });
});

describe("daysUntil", () => {
  it("is positive for future dates", () => {
    expect(daysUntil("2026-11-21", "2026-11-11")).toBe(10);
  });
  it("is zero for same day and negative when overdue", () => {
    expect(daysUntil("2026-11-11", "2026-11-11")).toBe(0);
    expect(daysUntil("2026-11-01", "2026-11-11")).toBe(-10);
  });
  it("returns null for invalid input", () => {
    expect(daysUntil("bad", "2026-11-11")).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("formats local date", () => {
    expect(todayIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
