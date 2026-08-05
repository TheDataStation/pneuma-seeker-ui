// src/components/datasets/MetadataEditor.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createMemoryEntry,
  deleteMemoryEntry,
  listDatasetTables,
  listMemoryEntries,
  queryDatasetTable,
  updateMemoryEntry,
} from "@/lib/api";
import { DeleteButton } from "@/components/memory/EntryListPanel";
import type { MemoryEntry } from "@/lib/types";

type Kind = "table_metadata" | "column_metadata";

/**
 * Structured create/edit UI for table & column descriptions. A master-detail
 * layout: pick a table (and, for column_metadata, a column) from the
 * dataset's actual schema — each row flagged as described or not, so
 * coverage gaps are visible at a glance — then edit its description on the
 * right. The key_text the backend requires (table name, or "table.column")
 * is derived from the selection, never hand-typed.
 */
export function MetadataEditor({
  dataset,
  kind,
}: {
  dataset: string;
  kind: Kind;
}) {
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [scopeTable, setScopeTable] = useState(""); // column_metadata only: which table's columns to list
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  const [selectedTable, setSelectedTable] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const res = await listMemoryEntries(kind, {
        datasetName: dataset,
        limit: 200,
      });
      setEntries(res.items);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoaded(true);
    }
  }, [kind, dataset]);

  useEffect(() => {
    setLoadingTables(true);
    listDatasetTables(dataset)
      .then((r) => {
        setTables(r.tables);
        setScopeTable(r.tables[0] ?? "");
        if (kind === "table_metadata") setSelectedTable(r.tables[0] ?? "");
      })
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, kind]);

  useEffect(() => {
    if (kind !== "column_metadata" || !scopeTable) {
      setColumns([]);
      return;
    }
    setLoadingColumns(true);
    setSelectedColumn(""); // avoid showing the previous table's column while this loads
    queryDatasetTable(dataset, scopeTable, { limit: 1 })
      .then((r) => {
        setColumns(r.columns);
        setSelectedTable(scopeTable);
        setSelectedColumn(r.columns[0] ?? "");
      })
      .catch(() => setColumns([]))
      .finally(() => setLoadingColumns(false));
  }, [dataset, kind, scopeTable]);

  const entryByKey = useMemo(() => {
    const map = new Map<string, MemoryEntry>();
    for (const e of entries) if (e.key_text) map.set(e.key_text, e);
    return map;
  }, [entries]);

  const items = kind === "table_metadata" ? tables : columns;
  const selectedName =
    kind === "table_metadata" ? selectedTable : selectedColumn;
  const keyText =
    kind === "table_metadata"
      ? selectedTable
      : selectedTable && selectedColumn
        ? `${selectedTable}.${selectedColumn}`
        : "";
  const existing = keyText ? entryByKey.get(keyText) : undefined;
  const describedCount = items.filter((name) => {
    const k = kind === "table_metadata" ? name : `${scopeTable}.${name}`;
    return entryByKey.has(k);
  }).length;

  useEffect(() => {
    setDraft(existing?.content ?? "");
    setError(null);
    // Only re-sync the draft when the selected key changes, not on every
    // `entries` refresh — otherwise saving would blow away in-flight edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyText]);

  function select(name: string) {
    if (kind === "table_metadata") {
      setSelectedTable(name);
    } else {
      setSelectedColumn(name);
    }
  }

  async function handleSave() {
    if (!keyText || !draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (existing) {
        await updateMemoryEntry(existing.memory_id, draft.trim());
      } else {
        await createMemoryEntry({
          memory_type: kind,
          content: draft.trim(),
          dataset_name: dataset,
          key_text: keyText,
        });
      }
      await loadEntries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save description.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteMemoryEntry(existing.memory_id);
      setDraft("");
      await loadEntries();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to delete description.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingTables) {
    return (
      <p className="py-6 text-center text-sm text-slate/60">Loading tables…</p>
    );
  }

  if (tables.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate/60">
        This dataset has no tables.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {kind === "column_metadata" && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate/60">
            Table
          </label>
          <select
            value={scopeTable}
            onChange={(e) => setScopeTable(e.target.value)}
            className="rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
          >
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {entriesLoaded && (
        <p className="px-1 text-xs text-slate/50">
          {describedCount} of {items.length}{" "}
          {kind === "table_metadata" ? "tables" : "columns"} described
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-[13rem_1fr]">
        {/* Picker list, with per-item description status */}
        <div className="max-h-[24rem] space-y-1 overflow-y-auto rounded-xl border border-sand-strong/50 bg-sand/20 dark:bg-white/[0.02] p-1.5">
          {loadingColumns ? (
            <p className="px-2 py-4 text-center text-xs text-slate/50">
              Loading columns…
            </p>
          ) : items.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate/50">
              No columns found.
            </p>
          ) : (
            items.map((name) => {
              const k =
                kind === "table_metadata" ? name : `${scopeTable}.${name}`;
              const described = entryByKey.has(k);
              const isSelected = name === selectedName;
              return (
                <button
                  key={name}
                  onClick={() => select(name)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${
                    isSelected
                      ? "bg-ember/15 text-ink"
                      : "text-slate/70 hover:bg-sand/60 dark:hover:bg-white/[0.05] hover:text-ink"
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${described ? "bg-ember" : "bg-slate/25"}`}
                    title={described ? "Described" : "No description yet"}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Editor for the selected table/column */}
        <div className="min-w-0 space-y-3 rounded-xl border border-sand-strong/50 bg-sand/20 dark:bg-white/[0.02] p-4">
          {selectedName ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">
                  {kind === "table_metadata"
                    ? selectedName
                    : `${scopeTable}.${selectedName}`}
                </p>
                {existing && (
                  <span className="shrink-0 rounded-full bg-ember/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ember">
                    Described
                  </span>
                )}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                placeholder={
                  kind === "table_metadata"
                    ? "Describe what this table contains…"
                    : "Describe what this column means…"
                }
                className="w-full rounded-lg border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              />
              {error && <p className="text-xs text-red-700">{error}</p>}
              <div className="flex items-center justify-end gap-4">
                {existing && <DeleteButton onDelete={handleDelete} />}
                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !draft.trim() ||
                    draft.trim() === existing?.content
                  }
                  className="cursor-pointer rounded-lg bg-ember px-4 py-2 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : existing
                      ? "Update description"
                      : "Save description"}
                </button>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate/60">
              Select a {kind === "table_metadata" ? "table" : "column"} to add
              or edit its description.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
