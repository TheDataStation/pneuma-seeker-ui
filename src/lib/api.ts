// src/lib/api.ts
import type {
  User,
  Group,
  LoginRequest,
  RegisterRequest,
  GroupCreateRequest,
  TokenResponse,
  ChatRequest,
  ChatHistoryResponse,
  ChatStateResponse,
  ProvenanceNodesResponse,
  TableRow,
  ChatStreamEvent,
  ChatListResponse,
  AccessibleDatasetResponse,
} from "./types";

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_PNEUMA_API_BASE ?? "http://localhost:8000";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Helper to safely extract the token from localStorage on the client side.
 */
function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authToken = token ?? getStoredToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${DEFAULT_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const error = await response.json();
      message = error.detail ?? message;
    } catch {
      // Ignore JSON parsing failures for raw error payloads
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/* -------------------------------------------------------------------------- */
/* Auth                                    */
/* -------------------------------------------------------------------------- */

export async function register(payload: RegisterRequest): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const data = await request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (typeof window !== "undefined" && data.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

export async function logout(token?: string): Promise<{ status: string }> {
  const result = await request<{ status: string }>("/auth/logout", {
    method: "POST",
  }, token);

  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }

  return result;
}

export async function getCurrentUser(token?: string): Promise<User> {
  return request<User>("/auth/me", {
    method: "GET",
  }, token);
}

/* -------------------------------------------------------------------------- */
/* Groups                                   */
/* -------------------------------------------------------------------------- */

export async function createGroup(
  payload: GroupCreateRequest,
  token?: string,
): Promise<Group> {
  return request<Group>(
    "/auth/groups",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function listGroups(token?: string): Promise<Group[]> {
  return request<Group[]>(
    "/auth/groups",
    {
      method: "GET",
    },
    token,
  );
}

/* -------------------------------------------------------------------------- */
/* Chat                                     */
/* -------------------------------------------------------------------------- */

/**
 * Submits a chat message payload and returns an asynchronous generator yielding individual events.
 */
export async function* streamChat(
  payload: ChatRequest,
  token?: string,
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authToken = token ?? getStoredToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${DEFAULT_BASE}/chat/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Chat streaming request failed";
    try {
      const error = await response.json();
      message = error.detail ?? message;
    } catch {
      // Fallback if the body does not contain a valid JSON detail property
    }
    throw new ApiError(response.status, message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream is not supported or missing from response.");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const parsedEvent: ChatStreamEvent = JSON.parse(trimmed);
        yield parsedEvent;
      } catch (err) {
        console.error("Failed to parse NDJSON stream line: ", trimmed, err);
      }
    }
  }

  if (buffer.trim()) {
    try {
      const parsedEvent: ChatStreamEvent = JSON.parse(buffer.trim());
      yield parsedEvent;
    } catch (err) {
      console.error("Failed to parse trailing NDJSON buffer: ", buffer, err);
    }
  }
}

export async function executeCode(
  chat_id: string,
  token?: string,
): Promise<TableRow[]> {
  return request<TableRow[]>(`/chat/execute_code/${chat_id}`, {
    method: "GET",
  }, token);
}

export async function getChatState(
  chat_id: string,
  token?: string,
): Promise<ChatStateResponse> {
  return request<ChatStateResponse>(`/chat/state/${chat_id}`, {
    method: "GET",
  }, token);
}

export async function getAccessibleDatasets(
  token?: string,
): Promise<AccessibleDatasetResponse> {
  return request<AccessibleDatasetResponse>(`/chat/datasets`, {
    method: "GET",
  }, token);
}

export async function getChatHistory(
  chat_id: string,
  token?: string,
): Promise<ChatHistoryResponse> {
  return request<ChatHistoryResponse>(`/chat/chat/${chat_id}/history`, {
    method: "GET",
  }, token);
}

export async function getAllChats(
  limit = 10,
  offset = 0,
  query?: string,
  token?: string,
): Promise<ChatListResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query) params.set("query", query);
  return request<ChatListResponse>(
    `/chat/sessions?${params}`,
    { method: "GET" },
    token,
  );
}

export async function getProvenanceNodes(
  chat_id: string,
  token?: string,
): Promise<ProvenanceNodesResponse> {
  return request<ProvenanceNodesResponse>(`/chat/provenance_nodes/${chat_id}`, {
    method: "GET",
  }, token);
}

export async function deleteChat(
  chat_id: string,
  token?: string,
): Promise<{ detail: string }> {
  return request<{ detail: string }>(`/chat/${chat_id}`, {
    method: "DELETE",
  }, token);
}

export async function downloadTargetViews(
  chat_id: string,
  token?: string,
): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${DEFAULT_BASE}/chat/target_views/${chat_id}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Failed to download target views ZIP archive.");
  }

  return response.blob();
}

export async function downloadE2EScript(
  chat_id: string,
  token?: string,
): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${DEFAULT_BASE}/chat/e2e_script/${chat_id}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Failed to download end-to-end materializer execution script.");
  }

  return response.blob();
}

export { ApiError };
