// src/components/datasets/DatasetManagementPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getAccessibleDatasets, uploadMemoryMetadataCsv } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { EntryListPanel } from "@/components/memory/EntryListPanel";
import { DatasetTableBrowser } from "@/components/datasets/DatasetTableBrowser";
import type { User } from "@/lib/types";

type ViewTab = "data" | "metadata";
type MetadataSubTab = "table_metadata" | "column_metadata";

const METADATA_SUBTAB_LABELS: Record<MetadataSubTab, string> = {
  table_metadata: "Tables",
  column_metadata: "Columns",
};

function DatasetMetadataView({ dataset, isAdmin }: { dataset: string; isAdmin: boolean }) {
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
              subTab === t ? "bg-white dark:bg-card text-ink shadow-sm" : "text-slate/60 hover:text-ink"
            }`}
          >
            {METADATA_SUBTAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-dashed border-sand-strong/70 px-4 py-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate/60">
            Bulk upload ({subTab === "table_metadata" ? "table_name, description" : "table_name, column_name, description"})
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
            <a href={`/samples/sample_${subTab}.csv`} download className="text-xs text-ember hover:underline">
              Download sample CSV
            </a>
          </div>
          {uploading && <p className="text-xs text-slate/60">Uploading…</p>}
          {uploadMsg && <p className="text-xs text-green-700">{uploadMsg}</p>}
          {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
        </div>
      )}

      <EntryListPanel
        key={`${dataset}-${subTab}-${refreshKey}`}
        memoryType={subTab}
        datasetName={dataset}
        canCreate
        canEdit
      />
    </div>
  );
}

export default function DatasetManagementPanel({ user }: { user: User }) {
  const [datasets, setDatasets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("data");

  const isAdmin = user.group_name === "admin";

  useEffect(() => {
    getAccessibleDatasets()
      .then((r) => {
        setDatasets(r.datasets);
        setSelected((d) => d || r.datasets[0] || "");
      })
      .catch(() => setDatasets([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate/60">Loading datasets…</p>;
  }

  if (datasets.length === 0) {
    return <p className="py-8 text-center text-sm text-slate/60">Your group has no accessible datasets.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Dataset showcase */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate/60">
          Your group&apos;s datasets
        </p>
        {datasets.map((d) => (
          <button
            key={d}
            onClick={() => setSelected(d)}
            className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
              selected === d
                ? "border-ember/60 bg-ember/10 text-ink"
                : "border-sand-strong/60 bg-card text-slate hover:border-slate/40 hover:text-ink"
            }`}
          >
            {d}
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
                viewTab === "data" ? "bg-white dark:bg-card text-ink shadow-sm" : "text-slate/60 hover:text-ink"
              }`}
            >
              Browse Data
            </button>
            <button
              onClick={() => setViewTab("metadata")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                viewTab === "metadata" ? "bg-white dark:bg-card text-ink shadow-sm" : "text-slate/60 hover:text-ink"
              }`}
            >
              Metadata
            </button>
          </div>
        </div>

        {viewTab === "data" ? (
          <DatasetTableBrowser key={selected} datasetName={selected} />
        ) : (
          <DatasetMetadataView key={selected} dataset={selected} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
