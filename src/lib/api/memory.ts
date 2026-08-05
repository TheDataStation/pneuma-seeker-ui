// src/lib/api/memory.ts — mirrors routers/memory.py
import { CONFIG } from "../config";
import { ApiError, getStoredToken, request } from "./base";
import type {
  CreateMemoryEntryRequest,
  MemoryEntry,
  MemoryEntryListResponse,
  MemoryMetadataUploadResponse,
  MemoryType,
} from "../types";

export async function listMemoryEntries(
  memoryType: MemoryType,
  params: { datasetName?: string; limit?: number; offset?: number } = {},
  token?: string,
): Promise<MemoryEntryListResponse> {
  const query = new URLSearchParams({ memory_type: memoryType });
  if (params.datasetName) query.set("dataset_name", params.datasetName);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  return request<MemoryEntryListResponse>(`/memory/entries?${query}`, { method: "GET" }, token);
}

export async function createMemoryEntry(
  payload: CreateMemoryEntryRequest,
  token?: string,
): Promise<MemoryEntry> {
  return request<MemoryEntry>(
    "/memory/entries",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateMemoryEntry(
  memoryId: string,
  content: string,
  token?: string,
): Promise<MemoryEntry> {
  return request<MemoryEntry>(
    `/memory/entries/${memoryId}`,
    { method: "PATCH", body: JSON.stringify({ content }) },
    token,
  );
}

export async function deleteMemoryEntry(
  memoryId: string,
  token?: string,
): Promise<{ detail: string }> {
  return request<{ detail: string }>(`/memory/entries/${memoryId}`, { method: "DELETE" }, token);
}

export async function uploadMemoryMetadataCsv(
  datasetName: string,
  memoryType: "table_metadata" | "column_metadata",
  file: File,
  token?: string,
): Promise<MemoryMetadataUploadResponse> {
  const formData = new FormData();
  formData.append("dataset_name", datasetName);
  formData.append("memory_type", memoryType);
  formData.append("file", file);

  const headers: Record<string, string> = {};
  const authToken = token ?? getStoredToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${CONFIG.BACKEND_BASE_URL}/memory/metadata/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload metadata CSV";
    try {
      const error = await response.json();
      message = error.detail ?? message;
    } catch {
      // Ignore JSON parsing failures for raw error payloads
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}
