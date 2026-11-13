// src/lib/api/datasets.ts
import { CONFIG } from "../config";
import type {
  ConnectorHealth,
  ConnectorType,
  DatasetInfo,
  DatasetListResponse,
  DatasetSourceDetail,
  UploadLimits,
  UploadResult,
} from "../types";
import { ApiError, getStoredToken, request } from "./base";

const enc = encodeURIComponent;

export async function listDatasets(token?: string): Promise<DatasetListResponse> {
  return request<DatasetListResponse>("/datasets", { method: "GET" }, token);
}

export async function getUploadLimits(token?: string): Promise<UploadLimits> {
  return request<UploadLimits>("/datasets/uploads/limits", { method: "GET" }, token);
}

/**
 * Uploads one file as the raw request body (not multipart), so progress can be
 * reported; its tables are added to `datasetName`, created with `create`.
 */
export function uploadDatasetFile(
  datasetName: string,
  file: File,
  options: { create?: boolean; replace?: boolean; onProgress?: (fraction: number) => void } = {},
  token?: string,
): Promise<UploadResult> {
  const query = new URLSearchParams({
    create: String(Boolean(options.create)),
    replace: String(Boolean(options.replace)),
  });
  const url = `${CONFIG.BACKEND_BASE_URL}/datasets/${enc(datasetName)}/upload/${enc(file.name)}?${query}`;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    const authToken = token ?? getStoredToken();
    if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { detail?: string } & Partial<UploadResult> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // a proxy's HTML error page, for instance
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
      else reject(new ApiError(xhr.status, body.detail ?? (xhr.status === 413 ? "The file is too large." : "Upload failed.")));
    };
    xhr.onerror = () => reject(new ApiError(0, "The file didn't reach the server: check your connection and try again."));
    xhr.send(file);
  });
}

export async function deleteDatasetTable(datasetName: string, tableName: string, token?: string): Promise<void> {
  await request(`/datasets/${enc(datasetName)}/tables/${enc(tableName)}`, { method: "DELETE" }, token);
}

export async function removeDataset(datasetName: string, token?: string): Promise<void> {
  await request(`/datasets/${enc(datasetName)}`, { method: "DELETE" }, token);
}

export async function getDatasetSource(datasetName: string, token?: string): Promise<DatasetSourceDetail> {
  return request<DatasetSourceDetail>(`/datasets/${enc(datasetName)}/source`, { method: "GET" }, token);
}

export async function testDatasetSource(
  body: { connector_type: ConnectorType; config: Record<string, string>; name?: string },
  token?: string,
): Promise<ConnectorHealth> {
  return request<ConnectorHealth>("/datasets/sources/test", { method: "POST", body: JSON.stringify(body) }, token);
}

export async function addDatasetSource(
  body: { name: string; connector_type: ConnectorType; config: Record<string, string> },
  token?: string,
): Promise<DatasetInfo> {
  return request<DatasetInfo>("/datasets/sources", { method: "POST", body: JSON.stringify(body) }, token);
}

export async function updateDatasetSource(
  datasetName: string,
  config: Record<string, string>,
  token?: string,
): Promise<DatasetInfo> {
  return request<DatasetInfo>(
    `/datasets/sources/${enc(datasetName)}`,
    { method: "PUT", body: JSON.stringify({ config }) },
    token,
  );
}

export interface IndexStatus {
  dataset_name: string;
  /** The configured TABLE_DISCOVERY_METHOD the index is for. */
  method: "m1" | "pneuma_retriever";
  state: "built" | "building" | "failed" | "missing";
  built_at: string | null;
  error: string | null;
  /** Tables read so far while building (M1 only). */
  progress: { done: number; total: number } | null;
}

/** Starts rebuilding a dataset's retrieval index (in the background). */
export async function rebuildDatasetIndex(datasetName: string, token?: string): Promise<{ started: boolean }> {
  return request<{ started: boolean }>(`/datasets/${enc(datasetName)}/index`, { method: "POST" }, token);
}

export async function getDatasetIndexStatus(datasetName: string, token?: string): Promise<IndexStatus> {
  return request<IndexStatus>(`/datasets/${enc(datasetName)}/index`, { method: "GET" }, token);
}
