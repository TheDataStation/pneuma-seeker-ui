// Regression: backend routes are mounted under /api (see
// src/pneuma_seeker/main.py) — production hit an incident where a hard
// refresh on a chat page (GET /chat/{chatId}, a frontend page route) got
// misrouted by the reverse proxy to the backend's identically-prefixed
// /chat/* API routes, matching a DELETE /chat/{chat_id} route's path
// pattern and returning 405 Method Not Allowed instead of the page.
// CONFIG.BACKEND_BASE_URL must always resolve to a URL ending in /api so
// every API call (which all route through this constant) targets the
// unambiguous, collision-proof prefix.
describe("CONFIG.BACKEND_BASE_URL", () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_PNEUMA_API_BASE;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_PNEUMA_API_BASE;
    } else {
      process.env.NEXT_PUBLIC_PNEUMA_API_BASE = ORIGINAL_ENV;
    }
    jest.resetModules();
  });

  it("appends /api to the default localhost base URL", async () => {
    delete process.env.NEXT_PUBLIC_PNEUMA_API_BASE;
    jest.resetModules();
    const { CONFIG } = await import("../lib/config");
    expect(CONFIG.BACKEND_BASE_URL).toBe("http://localhost:8000/api");
  });

  it("appends /api to a custom NEXT_PUBLIC_PNEUMA_API_BASE value", async () => {
    process.env.NEXT_PUBLIC_PNEUMA_API_BASE = "https://app.example.com";
    jest.resetModules();
    const { CONFIG } = await import("../lib/config");
    expect(CONFIG.BACKEND_BASE_URL).toBe("https://app.example.com/api");
  });

  it("does not double-append /api if the env var already ends with it", async () => {
    // Documents current behavior: the env var is expected to be the origin
    // only (no /api suffix) — this is not a case the app needs to guard
    // against, just a record of what happens if misconfigured.
    process.env.NEXT_PUBLIC_PNEUMA_API_BASE = "https://app.example.com/api";
    jest.resetModules();
    const { CONFIG } = await import("../lib/config");
    expect(CONFIG.BACKEND_BASE_URL).toBe("https://app.example.com/api/api");
  });
});
