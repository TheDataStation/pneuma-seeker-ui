// src/components/datasets/UploadFiles.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, getUploadLimits, uploadDatasetFile } from "@/lib/api";
import type { UploadResult } from "@/lib/types";
import {
  DatasetModal,
  dangerButton,
  fieldClasses,
  labelClasses,
  primaryButton,
  secondaryButton,
} from "@/components/datasets/DatasetModal";

const ACCEPT = ".csv,.tsv,.parquet,.parq,.xlsx";
export const NAME_RE = /^[a-z][a-z0-9_]{0,62}$/;

type FileState =
  | { status: "pending" }
  | { status: "uploading"; progress: number }
  | { status: "done"; result: UploadResult }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type Item = { id: number; file: File; state: FileState };

/** Formats a size like the server's messages: 512 B, 976.6 KB, 150.2 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let n = bytes;
  for (const unit of ["KB", "MB", "GB"]) {
    n /= 1024;
    if (n < 1024 || unit === "GB") return `${n.toFixed(1)} ${unit}`;
  }
  return `${n.toFixed(1)} GB`;
}

function summary(result: UploadResult): string {
  return result.tables
    .map((t) => `${t.name} (${t.rows.toLocaleString()} rows${t.replaced ? ", replaced" : ""})`)
    .join(", ");
}

/**
 * Uploads CSV, TSV, Parquet and Excel files into a local dataset, or creates
 * one: each file becomes a table named after it (an Excel file, one per sheet).
 * Files go one at a time with progress; a table that already exists is only
 * replaced on an explicit "Replace table". When every file is in, `onUploaded` runs.
 */
export function UploadFilesForm({
  datasetName,
  onUploaded,
  onClose,
  onBusyChange,
}: {
  datasetName?: string;
  onUploaded: (datasetName: string) => void;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [name, setName] = useState(datasetName ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [maxBytes, setMaxBytes] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    getUploadLimits()
      .then((limits) => setMaxBytes(limits.max_file_bytes))
      .catch(() => setMaxBytes(null));
  }, []);

  const target = datasetName ?? name.trim();
  const nameOk = datasetName != null || NAME_RE.test(target);
  const anyPending = items.some((i) => i.state.status === "pending");
  const anyDone = items.some((i) => i.state.status === "done");

  function setBusyState(value: boolean) {
    setBusy(value);
    onBusyChange?.(value);
  }

  function update(index: number, state: FileState) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, state } : item)));
  }

  async function send(index: number, file: File, replace: boolean, create: boolean) {
    update(index, { status: "uploading", progress: 0 });
    try {
      const result = await uploadDatasetFile(target, file, {
        replace,
        create,
        onProgress: (progress) => update(index, { status: "uploading", progress }),
      });
      update(index, { status: "done", result });
      return true;
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Upload failed.";
      update(index, e instanceof ApiError && e.status === 409 ? { status: "conflict", message } : { status: "error", message });
      return false;
    }
  }

  async function uploadPending() {
    setBusyState(true);
    let allIn = true;
    // The first file of a new dataset creates it; the rest go into it.
    let created = datasetName != null || anyDone;
    for (const [index, item] of items.entries()) {
      if (item.state.status === "pending") {
        const ok = await send(index, item.file, false, !created);
        created = created || ok;
        allIn = ok && allIn;
      } else allIn = allIn && item.state.status === "done";
    }
    setBusyState(false);
    if (allIn) onUploaded(target);
  }

  async function replace(index: number) {
    setBusyState(true);
    const ok = await send(index, items[index].file, true, false);
    setBusyState(false);
    if (ok && items.every((item, i) => i === index || item.state.status === "done")) onUploaded(target);
  }

  return (
    <div className="space-y-4">
      {datasetName == null && (
        <div className="space-y-1.5">
          <label className={labelClasses} htmlFor="upload-dataset-name">
            Dataset name
          </label>
          <input
            id="upload-dataset-name"
            value={name}
            disabled={busy || anyDone}
            onChange={(e) => setName(e.target.value)}
            placeholder="lowercase_with_underscores"
            className={fieldClasses}
          />
          {name.trim() !== "" && !nameOk && (
            <p className="text-xs text-red-700">
              Use lowercase letters, digits and underscores, starting with a letter (at most 63 characters).
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-label="Choose files to upload"
          onChange={(e) => {
            const chosen = Array.from(e.target.files ?? []);
            setItems((current) => [
              ...current,
              ...chosen.map((file) => ({
                id: nextId.current++,
                file,
                state: (maxBytes != null && file.size > maxBytes
                  ? { status: "error", message: `The file is too large: each file can be at most ${formatBytes(maxBytes)}.` }
                  : { status: "pending" }) as FileState,
              })),
            ]);
            e.target.value = "";
          }}
        />
        <button type="button" className={secondaryButton} disabled={busy} onClick={() => fileInput.current?.click()}>
          Choose files
        </button>
        <span className="text-xs text-slate/70">
          CSV, TSV, Parquet or Excel (.xlsx){maxBytes != null && `, up to ${formatBytes(maxBytes)} each`}. Each becomes
          a table named after it, stored as Parquet.
        </span>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Files">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border border-sand-strong/60 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-ink">{item.file.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {item.state.status === "pending" && (
                    <span className="text-xs tabular-nums text-slate/60">{formatBytes(item.file.size)}</span>
                  )}
                  {item.state.status === "uploading" && (
                    <span className="text-xs text-slate/60">{Math.round(item.state.progress * 100)}%</span>
                  )}
                  {item.state.status === "done" && <span className="text-xs text-green-700">Uploaded</span>}
                  {item.state.status === "conflict" && (
                    <button type="button" className={dangerButton} disabled={busy} onClick={() => replace(index)}>
                      Replace table
                    </button>
                  )}
                  {item.state.status !== "uploading" && item.state.status !== "done" && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      disabled={busy}
                      onClick={() => setItems((current) => current.filter((i) => i.id !== item.id))}
                      className="cursor-pointer rounded-md px-1 text-slate/60 hover:text-ink disabled:opacity-40"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {item.state.status === "uploading" && (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-strong/50"
                  role="progressbar"
                  aria-valuenow={Math.round(item.state.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-ember" style={{ width: `${item.state.progress * 100}%` }} />
                </div>
              )}
              {item.state.status === "done" && <p className="mt-1 text-xs text-slate/70">{summary(item.state.result)}</p>}
              {(item.state.status === "conflict" || item.state.status === "error") && (
                <p className="mt-1 text-xs text-red-700">{item.state.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          className={secondaryButton}
          disabled={busy}
          onClick={() => (anyDone ? onUploaded(target) : onClose())}
        >
          {anyDone ? "Done" : "Cancel"}
        </button>
        <button type="button" className={primaryButton} disabled={busy || !anyPending || !nameOk} onClick={uploadPending}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

/** Uploads files as new tables of an existing local dataset. */
export function UploadFilesModal({
  datasetName,
  onClose,
  onUploaded,
}: {
  datasetName: string;
  onClose: () => void;
  onUploaded: (datasetName: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <DatasetModal title={`Upload tables to ${datasetName}`} busy={busy} onClose={onClose}>
      <UploadFilesForm datasetName={datasetName} onUploaded={onUploaded} onClose={onClose} onBusyChange={setBusy} />
    </DatasetModal>
  );
}
