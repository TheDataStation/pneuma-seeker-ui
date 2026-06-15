// src/lib/config.ts

export const CONFIG = {
  BACKEND_BASE_URL: process.env.NEXT_PUBLIC_PNEUMA_API_BASE ?? "http://localhost:8000",
  HISTORY_CACHE_LIMIT: parseInt(process.env.NEXT_PUBLIC_HISTORY_CACHE_LIMIT || '10', 10),
};
