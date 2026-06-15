import { formatTime, generateUUID, getRelativeTime } from "@/lib/utils";

describe("formatTime", () => {
  it("returns a string with hours and minutes", () => {
    const ts = new Date("2024-03-01T14:30:00").getTime();
    const result = formatTime(ts);
    expect(typeof result).toBe("string");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("produces different output for different timestamps", () => {
    const morning = new Date("2024-03-01T08:00:00").getTime();
    const evening = new Date("2024-03-01T20:00:00").getTime();
    expect(formatTime(morning)).not.toBe(formatTime(evening));
  });
});

describe("generateUUID", () => {
  it("returns a non-empty string", () => {
    const id = generateUUID();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on repeated calls", () => {
    const ids = new Set(Array.from({ length: 20 }, generateUUID));
    expect(ids.size).toBe(20);
  });
});

describe("getRelativeTime", () => {
  it("returns a string for the current time", () => {
    const result = getRelativeTime(new Date());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("describes a past hour correctly", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(getRelativeTime(oneHourAgo)).toContain("hour");
  });

  it("describes a future hour correctly", () => {
    const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
    expect(getRelativeTime(oneHourLater)).toContain("hour");
  });

  it("describes a past day correctly", () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(getRelativeTime(yesterday)).toContain("day");
  });

  it("accepts a numeric timestamp", () => {
    const result = getRelativeTime(Date.now() - 3600 * 1000);
    expect(typeof result).toBe("string");
  });
});
