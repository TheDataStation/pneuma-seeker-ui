// src/components/datasets/DatasetIndexControl.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getDatasetIndexStatus, rebuildDatasetIndex } from "@/lib/api";
import type { IndexStatus } from "@/lib/api/datasets";
import { secondaryButton } from "@/components/datasets/DatasetModal";

const POLL_MS = 1000;

function describe(status: IndexStatus | null): string {
  if (status == null) return "";
  switch (status.state) {
    case "building":
      return status.progress
        ? `Building the index: ${status.progress.done.toLocaleString()} / ${status.progress.total.toLocaleString()} tables read.`
        : "Building the index…";
    case "failed":
      return `Indexing failed: ${status.error ?? "unknown error"}`;
    case "missing":
      return status.method === "m1" ? "Not indexed yet (built on the first search)." : "Not indexed yet.";
    default:
      return status.built_at ? `Indexed ${new Date(status.built_at).toLocaleString()}.` : "Indexed.";
  }
}

/**
 * Shows a dataset's retrieval index state and rebuilds it on demand. M1 rebuilds
 * by itself when files change, but not when a connected database's tables do.
 */
export function DatasetIndexControl({ datasetName }: { datasetName: string }) {
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return getDatasetIndexStatus(datasetName)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [datasetName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (status?.state !== "building") return;
    const timer = setTimeout(refresh, POLL_MS);
    return () => clearTimeout(timer);
  }, [status, refresh]);

  async function handleRebuild() {
    setError(null);
    try {
      await rebuildDatasetIndex(datasetName);
      setStatus((s) => (s ? { ...s, state: "building", error: null } : s));
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start indexing.");
    }
  }

  const building = status?.state === "building";
  const failed = status?.state === "failed" || error != null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={secondaryButton}
        disabled={building}
        onClick={handleRebuild}
        title={
          status?.method === "pneuma_retriever"
            ? "Builds the Pneuma retriever's indices (an LLM call per column)."
            : "Rebuilds the M1 index now, e.g. after the tables of a connected database changed."
        }
      >
        {building ? "Building index…" : "Build Data Discovery Index"}
      </button>
      {building && status?.progress && (
        <div
          className="h-1.5 w-32 overflow-hidden rounded-full bg-sand-strong/50"
          role="progressbar"
          aria-valuenow={status.progress.done}
          aria-valuemin={0}
          aria-valuemax={status.progress.total}
        >
          <div
            className="h-full bg-ember transition-all"
            style={{ width: `${(100 * status.progress.done) / Math.max(status.progress.total, 1)}%` }}
          />
        </div>
      )}
      <span className={`text-xs ${failed ? "text-red-700" : "text-slate/60"}`}>{error ?? describe(status)}</span>
    </div>
  );
}
