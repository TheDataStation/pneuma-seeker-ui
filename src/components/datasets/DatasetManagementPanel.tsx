// src/components/datasets/DatasetManagementPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getDatasetSource,
  listDatasets,
  removeDataset,
  uploadMemoryMetadataCsv,
} from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { AddDatasetModal } from "@/components/datasets/AddDatasetModal";
import { DatasetDescription } from "@/components/datasets/DatasetDescription";
import { DatasetIndexControl } from "@/components/datasets/DatasetIndexControl";
import { dangerButton, secondaryButton } from "@/components/datasets/DatasetModal";
import { DatasetTableBrowser } from "@/components/datasets/DatasetTableBrowser";
import { MetadataEditor } from "@/components/datasets/MetadataEditor";
import { UploadFilesModal } from "@/components/datasets/UploadFiles";
import type { DatasetInfo, DatasetSourceDetail } from "@/lib/types";

type ViewTab = "data" | "metadata";
type MetadataSubTab = "table_metadata" | "column_metadata";

const METADATA_SUBTAB_LABELS: Record<MetadataSubTab, string> = {
  table_metadata: "Tables",
  column_metadata: "Columns",
};

function DatasetMetadataView({
  dataset,
  isAdmin,
}: {
  dataset: string;
  isAdmin: boolean;
}) {
  const [subTab, setSubTab] = useState<MetadataSubTab>("table_metadata");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    setUploadError(null);
    try {
      const res = await uploadMemoryMetadataCsv(dataset, subTab, file);
      setUploadMsg(`Stored ${res.rows_stored} row(s).`);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-sand-strong/60 bg-sand/40 dark:bg-white/[0.03] p-1 w-fit">
        {(Object.keys(METADATA_SUBTAB_LABELS) as MetadataSubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              subTab === t
                ? "bg-white dark:bg-card text-ink shadow-sm"
                : "text-slate/60 hover:text-ink"
            }`}
          >
            {METADATA_SUBTAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-dashed border-sand-strong/70 px-4 py-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate/60">
            Bulk upload (
            {subTab === "table_metadata"
              ? "table_name, description"
              : "table_name, column_name, description"}
            )
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
              className="text-xs text-slate/70"
            />
            <a
              href={`/samples/sample_${subTab}.csv`}
              download
              className="text-xs text-ember hover:underline"
            >
              Download sample CSV
            </a>
          </div>
          {uploading && <p className="text-xs text-slate/60">Uploading…</p>}
          {uploadMsg && <p className="text-xs text-green-700">{uploadMsg}</p>}
          {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
        </div>
      )}

      <MetadataEditor
        key={`${dataset}-${subTab}-${refreshKey}`}
        dataset={dataset}
        kind={subTab}
      />
    </div>
  );
}

type Dialog =
  | { kind: "add" }
  | { kind: "upload"; dataset: string }
  | { kind: "edit"; source: DatasetSourceDetail }
  | null;

// Who may manage datasets comes from the backend (`can_manage`), not the user's group name.
export default function DatasetManagementPanel() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("data");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback((select?: string) => {
    return listDatasets()
      .then((r) => {
        setDatasets(r.datasets);
        setCanManage(r.can_manage);
        setSelected((current) => {
          const names = r.datasets.map((d) => d.name);
          const wanted = select ?? current;
          return names.includes(wanted) ? wanted : names[0] ?? "";
        });
      })
      .catch(() => setDatasets([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const current = datasets.find((d) => d.name === selected);

  function afterChange(datasetName: string, text: string) {
    setDialog(null);
    setNotice({ ok: true, text });
    setRefreshKey((k) => k + 1);
    reload(datasetName);
  }

  async function run(action: () => Promise<unknown>, success: string, after?: () => void) {
    setNotice(null);
    try {
      await action();
      setNotice({ ok: true, text: success });
      after?.();
    } catch (e) {
      setNotice({ ok: false, text: e instanceof ApiError ? e.message : "Something went wrong." });
    }
  }

  async function handleRemove(dataset: DatasetInfo) {
    const what = dataset.is_local
      ? "its uploaded tables are deleted from the server"
      : "the source itself is left untouched";
    if (!window.confirm(`Remove ${dataset.name}? Its descriptions are deleted and ${what}.`)) return;
    await run(() => removeDataset(dataset.name), `Removed ${dataset.name}.`, () => reload());
  }

  async function handleEdit(dataset: DatasetInfo) {
    setNotice(null);
    try {
      setDialog({ kind: "edit", source: await getDatasetSource(dataset.name) });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof ApiError ? e.message : "Couldn't load the connection." });
    }
  }

  const dialogs = (
    <>
      {dialog?.kind === "add" && (
        <AddDatasetModal onClose={() => setDialog(null)} onSaved={(name) => afterChange(name, `Added ${name}.`)} />
      )}
      {dialog?.kind === "upload" && (
        <UploadFilesModal
          datasetName={dialog.dataset}
          onClose={() => setDialog(null)}
          onUploaded={(name) => afterChange(name, `Uploaded tables to ${name}.`)}
        />
      )}
      {dialog?.kind === "edit" && (
        <AddDatasetModal
          existing={dialog.source}
          onClose={() => setDialog(null)}
          onSaved={(name) => afterChange(name, `Saved ${name}.`)}
        />
      )}
    </>
  );

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate/60">
        Loading datasets…
      </p>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-slate/60">
          {canManage ? "There are no datasets yet." : "Your group has no accessible datasets."}
        </p>
        {canManage && (
          <button className={secondaryButton} onClick={() => setDialog({ kind: "add" })}>
            Add dataset
          </button>
        )}
        {dialogs}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Dataset showcase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate/60">
            {canManage ? "Datasets" : "Your group\u2019s datasets"}
          </p>
          {canManage && (
            <button
              onClick={() => setDialog({ kind: "add" })}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-ember hover:bg-ember/10"
            >
              + Add dataset
            </button>
          )}
        </div>
        {datasets.map((d) => (
          <button
            key={d.name}
            onClick={() => setSelected(d.name)}
            className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              selected === d.name
                ? "border-ember/60 bg-ember/10 text-ink"
                : "border-sand-strong/60 bg-card text-slate hover:border-slate/40 hover:text-ink"
            }`}
          >
            <span className="block">{d.name}</span>
            <span className="block text-xs font-normal text-slate/60">
              {d.is_local ? "Uploaded" : d.connector_label}
            </span>
          </button>
        ))}
      </div>

      {/* Selected dataset detail */}
      <div className="panel min-w-0 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl text-ink">{selected}</h2>
            <HelpTooltip
              text={
                viewTab === "data"
                  ? "Browse every table in this dataset directly — searchable, sortable, and paginated."
                  : "Descriptions of tables and columns that help Pneuma (and you) understand what this dataset's data means. Admins can upload these in bulk via CSV."
              }
            />
          </div>
          <div className="flex gap-1 rounded-xl border border-sand-strong/60 bg-sand/40 dark:bg-white/[0.03] p-1">
            <button
              onClick={() => setViewTab("data")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                viewTab === "data"
                  ? "bg-white dark:bg-card text-ink shadow-sm"
                  : "text-slate/60 hover:text-ink"
              }`}
            >
              Browse Data
            </button>
            <button
              onClick={() => setViewTab("metadata")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                viewTab === "metadata"
                  ? "bg-white dark:bg-card text-ink shadow-sm"
                  : "text-slate/60 hover:text-ink"
              }`}
            >
              Metadata
            </button>
          </div>
        </div>

        {canManage && current && (
          <div className="flex flex-wrap items-center gap-2">
            {current.is_local ? (
              <button className={secondaryButton} onClick={() => setDialog({ kind: "upload", dataset: current.name })}>
                Upload tables
              </button>
            ) : (
              <button className={secondaryButton} onClick={() => handleEdit(current)}>
                Edit connection
              </button>
            )}
            <button className={dangerButton} onClick={() => handleRemove(current)}>
              Remove dataset
            </button>
            <DatasetIndexControl key={`${current.name}-${refreshKey}`} datasetName={current.name} />
          </div>
        )}
        {notice && (
          <p className={`text-xs ${notice.ok ? "text-green-700" : "text-red-700"}`}>{notice.text}</p>
        )}

        <DatasetDescription key={selected} dataset={selected} />

        {viewTab === "data" ? (
          <DatasetTableBrowser
            key={`${selected}-${refreshKey}`}
            datasetName={selected}
            canDeleteTables={canManage && Boolean(current?.is_local)}
          />
        ) : (
          <DatasetMetadataView
            key={selected}
            dataset={selected}
            isAdmin={canManage}
          />
        )}
      </div>
      {dialogs}
    </div>
  );
}
