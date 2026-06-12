// src/lib/config.ts

export const CONFIG = {
  HISTORY_CACHE_LIMIT: parseInt(process.env.NEXT_PUBLIC_HISTORY_CACHE_LIMIT || '10', 10),
};
