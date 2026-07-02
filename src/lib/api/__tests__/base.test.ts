import { ApiError, getStoredToken, request } from "@/lib/api/base";

// Backend routes are mounted under /api (see src/pneuma_seeker/main.py) so a
// reverse proxy can route by a single unambiguous prefix, without risking
// collision with same-named frontend page routes.
const BASE = "http://localhost:8000/api";

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores the HTTP status code", () => {
    const err = new ApiError(404, "Not found");
    expect(err.status).toBe(404);
  });

  it("stores the message", () => {
    const err = new ApiError(500, "Internal server error");
    expect(err.message).toBe("Internal server error");
  });

  it("is an instance of Error", () => {
    expect(new ApiError(400, "Bad request")).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// getStoredToken
// ---------------------------------------------------------------------------

describe("getStoredToken", () => {
  it("returns null when no token is stored", () => {
    expect(getStoredToken()).toBeNull();
  });

  it("returns the stored token from localStorage", () => {
    localStorage.setItem("token", "abc123");
    expect(getStoredToken()).toBe("abc123");
  });
});

// ---------------------------------------------------------------------------
// request
// ---------------------------------------------------------------------------

describe("request", () => {
  it("calls fetch with the correct base URL and path", async () => {
    mockFetch(200, { ok: true });
    await request("/some/path");
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/some/path`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("includes Content-Type: application/json header", async () => {
    mockFetch(200, {});
    await request("/path");
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("includes Authorization header when token is in localStorage", async () => {
    localStorage.setItem("token", "mytoken");
    mockFetch(200, {});
    await request("/path");
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer mytoken");
  });

  it("prefers the explicit token argument over localStorage", async () => {
    localStorage.setItem("token", "stored");
    mockFetch(200, {});
    await request("/path", {}, "explicit");
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer explicit");
  });

  it("omits Authorization header when no token is available", async () => {
    mockFetch(200, {});
    await request("/path");
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers["Authorization"]).toBeUndefined();
  });

  it("returns parsed JSON on a 200 response", async () => {
    mockFetch(200, { value: 42 });
    const result = await request<{ value: number }>("/path");
    expect(result).toEqual({ value: 42 });
  });

  it("returns undefined for 204 No Content", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, json: jest.fn() });
    const result = await request("/path");
    expect(result).toBeUndefined();
  });

  it("throws ApiError with the status code on a non-OK response", async () => {
    mockFetch(403, { detail: "Forbidden" }, false);
    await expect(request("/path")).rejects.toMatchObject({ status: 403 });
  });

  it("uses the detail field from the error JSON as the message", async () => {
    mockFetch(422, { detail: "Validation failed" }, false);
    await expect(request("/path")).rejects.toThrow("Validation failed");
  });

  it("falls back to 'Request failed' when the error body has no detail field", async () => {
    mockFetch(500, {}, false);
    await expect(request("/path")).rejects.toThrow("Request failed");
  });

  it("falls back to 'Request failed' when the error body is not valid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
    });
    await expect(request("/path")).rejects.toThrow("Request failed");
  });

  it("passes through method and body from options", async () => {
    mockFetch(200, {});
    await request("/path", { method: "POST", body: JSON.stringify({ x: 1 }) });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ x: 1 }));
  });
});
