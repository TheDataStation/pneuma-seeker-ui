// src/lib/api/chat.ts — mirrors routers/chat.py
import { CONFIG } from "../config";
import { ApiError, getStoredToken, request } from "./base";
import type {
  AccessibleDatasetResponse,
  ChatHistoryResponse,
  ChatListResponse,
  ChatRequest,
  ChatStateResponse,
  ChatStreamEvent,
  ProvenanceNodesResponse,
  TableQueryResponse,
  TableRow,
} from "../types";

/* -------------------------------------------------------------------------- */
/* Streaming chat                                                              */
/* -------------------------------------------------------------------------- */

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

  const response = await fetch(`${CONFIG.BACKEND_BASE_URL}/chat/`, {
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
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as ChatStreamEvent;
      } catch (err) {
        console.error("Failed to parse NDJSON stream line: ", trimmed, err);
      }
    }
  }

  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer.trim()) as ChatStreamEvent;
    } catch (err) {
      console.error("Failed to parse trailing NDJSON buffer: ", buffer, err);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Chat data                                                                   */
/* -------------------------------------------------------------------------- */

export async function executeCode(chat_id: string, token?: string): Promise<TableRow[]> {
  return request<TableRow[]>(`/chat/execute_code/${chat_id}`, { method: "GET" }, token);
}

export async function getChatState(
  chat_id: string,
  token?: string,
): Promise<ChatStateResponse> {
  return request<ChatStateResponse>(`/chat/state/${chat_id}`, { method: "GET" }, token);
}

export async function getAccessibleDatasets(
  token?: string,
): Promise<AccessibleDatasetResponse> {
  return request<AccessibleDatasetResponse>("/chat/datasets", { method: "GET" }, token);
}

export async function getChatHistory(
  chat_id: string,
  token?: string,
): Promise<ChatHistoryResponse> {
  return request<ChatHistoryResponse>(`/chat/chat/${chat_id}/history`, { method: "GET" }, token);
}

/* -------------------------------------------------------------------------- */
/* Session management                                                          */
/* -------------------------------------------------------------------------- */

export async function getAllChats(
  limit = 10,
  offset = 0,
  query?: string,
  token?: string,
): Promise<ChatListResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query) params.set("query", query);
  return request<ChatListResponse>(`/chat/sessions?${params}`, { method: "GET" }, token);
}

export async function deleteChat(
  chat_id: string,
  token?: string,
): Promise<{ detail: string }> {
  return request<{ detail: string }>(`/chat/${chat_id}`, { method: "DELETE" }, token);
}

/* -------------------------------------------------------------------------- */
/* Provenance / exports                                                        */
/* -------------------------------------------------------------------------- */

export async function queryTable(
  chat_id: string,
  table_id: string,
  params: {
    limit?: number;
    offset?: number;
    order_by?: string;
    order_dir?: string;
    search?: string;
    dataset_name?: string;
  },
  token?: string,
): Promise<TableQueryResponse> {
  const query = new URLSearchParams({ table_id });
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.order_by) query.set("order_by", params.order_by);
  if (params.order_dir) query.set("order_dir", params.order_dir);
  if (params.search) query.set("search", params.search);
  if (params.dataset_name) query.set("dataset_name", params.dataset_name);
  return request<TableQueryResponse>(`/chat/table_query/${chat_id}?${query}`, { method: "GET" }, token);
}

export async function explainScript(
  chat_id: string,
  token?: string,
): Promise<{ description: string }> {
  return request<{ description: string }>(
    `/chat/explain_script/${chat_id}`,
    { method: "GET" },
    token,
  );
}

export async function downloadTableCSV(
  chat_id: string,
  table_id: string,
  params: { dataset_name?: string },
  token?: string,
): Promise<Blob> {
  const query = new URLSearchParams({ table_id });
  if (params.dataset_name) query.set("dataset_name", params.dataset_name);

  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(
    `${CONFIG.BACKEND_BASE_URL}/chat/table_download/${chat_id}?${query}`,
    { method: "GET", headers },
  );
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to download table CSV.");
  }
  return response.blob();
}

export async function getProvenanceNodes(
  chat_id: string,
  token?: string,
): Promise<ProvenanceNodesResponse> {
  return request<ProvenanceNodesResponse>(
    `/chat/provenance_nodes/${chat_id}`,
    { method: "GET" },
    token,
  );
}

export async function downloadTargetViews(chat_id: string, token?: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(
    `${CONFIG.BACKEND_BASE_URL}/chat/target_views/${chat_id}`,
    { method: "GET", headers },
  );
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to download target views ZIP archive.");
  }
  return response.blob();
}

export async function downloadE2EScript(chat_id: string, token?: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(
    `${CONFIG.BACKEND_BASE_URL}/chat/e2e_script/${chat_id}`,
    { method: "GET", headers },
  );
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to download end-to-end materializer execution script.");
  }
  return response.blob();
}
