// src/lib/config.ts

// All backend routes are mounted under /api (see src/pneuma_seeker/main.py) so
// a reverse proxy can route by a single unambiguous prefix, instead of
// backend API paths risking collision with frontend page routes of the same
// name (e.g. DELETE /chat/{chat_id} vs. the frontend's own GET /chat/{chatId}
// page). Appended here rather than requiring every call site (or the
// deployed NEXT_PUBLIC_PNEUMA_API_BASE env var) to include it.
export const CONFIG = {
  BACKEND_BASE_URL: `${process.env.NEXT_PUBLIC_PNEUMA_API_BASE ?? "http://localhost:8000"}/api`,
  HISTORY_CACHE_LIMIT: parseInt(process.env.NEXT_PUBLIC_HISTORY_CACHE_LIMIT || '10', 10),
};
