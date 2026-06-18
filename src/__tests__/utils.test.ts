import {
  formatTime,
  generateUUID,
  getRelativeTime,
  saveBlob,
  clearStoredToken,
  downloadBlob,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// generateUUID
// ---------------------------------------------------------------------------

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

  it("falls back to Math.random when crypto.randomUUID is unavailable", () => {
    const orig = window.crypto.randomUUID;
    // @ts-expect-error deliberate removal to exercise fallback branch
    window.crypto.randomUUID = undefined;
    const id = generateUUID();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    window.crypto.randomUUID = orig;
  });
});

// ---------------------------------------------------------------------------
// getRelativeTime
// ---------------------------------------------------------------------------

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

  it("describes a past minute correctly", () => {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    expect(getRelativeTime(twoMinsAgo)).toContain("minute");
  });

  it("describes a past week correctly", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(getRelativeTime(twoWeeksAgo)).toContain("week");
  });
});

// ---------------------------------------------------------------------------
// saveBlob
// ---------------------------------------------------------------------------

describe("saveBlob", () => {
  function setupBlobMocks() {
    window.URL.createObjectURL = jest.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.fn();
    const removeSpy = jest.fn();
    const fakeAnchor = { href: "", download: "", click: clickSpy, remove: removeSpy };
    jest.spyOn(document, "createElement").mockReturnValueOnce(fakeAnchor as unknown as HTMLElement);
    jest.spyOn(document.body, "appendChild").mockImplementationOnce(jest.fn());
    return { clickSpy, removeSpy, fakeAnchor };
  }

  afterEach(() => jest.restoreAllMocks());

  it("creates an object URL, clicks the anchor, and revokes the URL", () => {
    const { clickSpy, removeSpy } = setupBlobMocks();
    const blob = new Blob(["data"], { type: "text/plain" });
    saveBlob(blob, "test.txt");

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("sets the correct download filename on the anchor", () => {
    const { fakeAnchor } = setupBlobMocks();
    saveBlob(new Blob(["x"]), "report.csv");
    expect(fakeAnchor.download).toBe("report.csv");
  });
});

// ---------------------------------------------------------------------------
// clearStoredToken
// ---------------------------------------------------------------------------

describe("clearStoredToken", () => {
  it("removes the token from localStorage", () => {
    localStorage.setItem("token", "mytoken");
    clearStoredToken();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("does not throw when no token is present", () => {
    localStorage.removeItem("token");
    expect(() => clearStoredToken()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// downloadBlob
// ---------------------------------------------------------------------------

describe("downloadBlob", () => {
  afterEach(() => jest.restoreAllMocks());

  it("calls saveBlob with the blob extracted from the response", async () => {
    const mockBlob = new Blob(["content"], { type: "application/octet-stream" });
    const response = { blob: jest.fn().mockResolvedValue(mockBlob) } as unknown as Response;

    window.URL.createObjectURL = jest.fn().mockReturnValue("blob:dl");
    window.URL.revokeObjectURL = jest.fn();
    const clickSpy = jest.fn();
    jest.spyOn(document, "createElement").mockReturnValueOnce({
      href: "", download: "", click: clickSpy, remove: jest.fn(),
    } as unknown as HTMLElement);
    jest.spyOn(document.body, "appendChild").mockImplementationOnce(jest.fn());

    await downloadBlob(response, "archive.zip");

    expect(response.blob).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
