// src/components/datasets/AddDatasetModal.tsx
"use client";

import { useMemo, useState } from "react";
import { ApiError, addDatasetSource, testDatasetSource, updateDatasetSource } from "@/lib/api";
import type { ConnectorHealth, ConnectorType, DatasetSourceDetail } from "@/lib/types";
import {
  DatasetModal,
  fieldClasses,
  labelClasses,
  primaryButton,
  secondaryButton,
} from "@/components/datasets/DatasetModal";
import { NAME_RE, UploadFilesForm } from "@/components/datasets/UploadFiles";

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  half?: boolean;
};

/** Connectors a dataset can be connected with; uploads are stored as a Parquet folder. */
export const CONNECTORS: { type: ConnectorType; label: string; fields: FieldDef[] }[] = [
  {
    type: "postgres",
    label: "Postgres",
    fields: [
      { key: "host", label: "Host", placeholder: "localhost", half: true },
      { key: "port", label: "Port", placeholder: "5432", optional: true, half: true },
      { key: "dbname", label: "Database", half: true },
      { key: "user", label: "User", half: true },
      { key: "password", label: "Password", type: "password", optional: true, half: true },
      { key: "schema", label: "Schema", placeholder: "public", optional: true, half: true },
    ],
  },
  {
    type: "csv_dir",
    label: "CSV folder",
    fields: [
      { key: "path", label: "Folder on the server", placeholder: "/data/archeology/dataset" },
      { key: "file_pattern", label: "File pattern", placeholder: "*.csv", optional: true },
    ],
  },
  {
    type: "parquet_dir",
    label: "Parquet folder",
    fields: [
      { key: "path", label: "Folder on the server (one subfolder per table)", placeholder: "/data/sales" },
      { key: "file_pattern", label: "File pattern", placeholder: "*.parquet", optional: true },
    ],
  },
  {
    type: "duckdb",
    label: "DuckDB file",
    fields: [{ key: "path", label: "File on the server", placeholder: "/data/sales.duckdb" }],
  },
  {
    type: "sqlite",
    label: "SQLite file",
    fields: [{ key: "path", label: "File on the server", placeholder: "/data/sales.sqlite" }],
  },
];

/**
 * Adds a dataset (admins only), by uploading files or by connecting a source
 * that is read where it lives. With `existing`, edits a connection: the name
 * and type are fixed, and a blank password keeps the stored one.
 */
export function AddDatasetModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: DatasetSourceDetail;
  onClose: () => void;
  onSaved: (datasetName: string) => void;
}) {
  const editing = existing != null;
  const [mode, setMode] = useState<"upload" | "connect">(editing ? "connect" : "upload");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<ConnectorType>(existing?.connector_type ?? "postgres");
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const [k, v] of Object.entries(existing?.config ?? {})) {
      if (v != null) base[k] = String(v);
    }
    if (editing) base.password = "";
    return base;
  });
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = useMemo(() => CONNECTORS.find((c) => c.type === type)?.fields ?? [], [type]);

  const payloadConfig = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      const v = (config[f.key] ?? "").trim();
      if (v || !f.optional) out[f.key] = v;
    }
    return out;
  }, [fields, config]);

  const requiredFilled = fields.every((f) => f.optional || (config[f.key] ?? "").trim());
  const canSubmit = (editing || NAME_RE.test(name.trim())) && requiredFilled && !submitting;

  function setField(key: string, value: string) {
    setConfig((c) => ({ ...c, [key]: value }));
    setHealth(null);
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    try {
      setHealth(
        await testDatasetSource({ connector_type: type, config: payloadConfig, name: existing?.name }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await updateDatasetSource(existing.name, payloadConfig);
      else await addDatasetSource({ name: name.trim(), connector_type: type, config: payloadConfig });
      onSaved(editing ? existing.name : name.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the dataset.");
    } finally {
      setSubmitting(false);
    }
  }

  const tab = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
      active ? "bg-white dark:bg-card text-ink shadow-sm" : "text-slate/60 hover:text-ink"
    }`;

  return (
    <DatasetModal
      title={editing ? `Edit ${existing.name}` : "Add dataset"}
      busy={uploading || submitting}
      wide={mode === "connect" && type === "postgres"}
      onClose={onClose}
    >
      {!editing && (
        <div className="mb-3 flex w-fit gap-1 rounded-xl border border-sand-strong/60 bg-sand/40 p-1 dark:bg-white/[0.03]" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "upload"} disabled={uploading}
                  className={tab(mode === "upload")} onClick={() => setMode("upload")}>
            Upload files
          </button>
          <button type="button" role="tab" aria-selected={mode === "connect"} disabled={uploading}
                  className={tab(mode === "connect")} onClick={() => setMode("connect")}>
            Connect a source
          </button>
        </div>
      )}
      <p className="mb-4 text-sm text-slate/80">
        {mode === "upload"
          ? "Upload CSV, TSV, Parquet or Excel files: they're stored on the server as a new dataset."
          : "Connect to where the data already lives: it's read there, never copied."}
      </p>

      {mode === "upload" ? (
        <UploadFilesForm onUploaded={onSaved} onClose={onClose} onBusyChange={setUploading} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClasses} htmlFor="source-name">Name</label>
              <input id="source-name" value={name} disabled={editing} onChange={(e) => setName(e.target.value)}
                     placeholder="lowercase_with_underscores" className={fieldClasses} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClasses} htmlFor="source-type">Type</label>
              <select
                id="source-type"
                value={type}
                disabled={editing}
                onChange={(e) => {
                  setType(e.target.value as ConnectorType);
                  setConfig({});
                  setHealth(null);
                }}
                className={fieldClasses}
              >
                {CONNECTORS.map((c) => (
                  <option key={c.type} value={c.type}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={`space-y-1.5 ${f.half ? "" : "sm:col-span-2"}`}>
                <label className={labelClasses} htmlFor={`source-${f.key}`}>
                  {f.label}
                  {f.optional && <span className="ml-1 lowercase text-slate/50">(optional)</span>}
                </label>
                <input
                  id={`source-${f.key}`}
                  type={f.type ?? "text"}
                  value={config[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={editing && f.key === "password" ? "leave blank to keep current" : f.placeholder}
                  className={fieldClasses}
                />
              </div>
            ))}
          </div>

          {health && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${health.ok
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"}`}>
              {health.ok ? `Connected: ${health.table_count} table${health.table_count === 1 ? "" : "s"}.` : health.error}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button type="button" className={secondaryButton} onClick={handleTest} disabled={testing || !requiredFilled}>
              {testing ? "Testing…" : "Test connection"}
            </button>
            <div className="flex items-center gap-3">
              <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
              <button type="submit" className={primaryButton} disabled={!canSubmit}>
                {submitting ? "Saving…" : editing ? "Save" : "Add dataset"}
              </button>
            </div>
          </div>
        </form>
      )}
    </DatasetModal>
  );
}
