// src/lib/api/index.ts
// Re-exports everything so `import { ... } from "@/lib/api"` still works.
// You can also import directly from "@/lib/api/auth" or "@/lib/api/chat".

export * from "./auth";
export * from "./chat";
export * from "./memory";
export { ApiError } from "./base";
