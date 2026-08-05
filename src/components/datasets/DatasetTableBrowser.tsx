// src/components/datasets/DatasetTableBrowser.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { listDatasetTables, queryDatasetTable } from "@/lib/api";
import type { TableQueryResponse } from "@/lib/types";

type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

/**
 * Always-expanded, paginated/sortable/searchable table viewer for a dataset —
 * the dataset-browsing counterpart to TableExplorerModal, minus the modal
 * chrome: the full data is shown directly instead of behind an "Expand" click.
 */
export function DatasetTableBrowser({ datasetName }: { datasetName: string }) {
  const [tables, setTables] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState("");

  const [data, setData] = useState<TableQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setTablesLoading(true);
    listDatasetTables(datasetName)
      .then((r) => {
        setTables(r.tables);
        setSelectedTable(r.tables[0] ?? "");
      })
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false));
  }, [datasetName]);

  // Reset browsing state whenever the selected table changes.
  useEffect(() => {
    setPage(0);
    setOrderBy(null);
    setOrderDir("asc");
    setSearch("");
    setDebouncedSearch("");
  }, [selectedTable]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, orderBy, orderDir]);

  const fetchData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    setError(null);
    try {
      const result = await queryDatasetTable(datasetName, selectedTable, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        order_by: orderBy ?? undefined,
        order_dir: orderDir,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch {
      setError("Failed to load table data.");
    } finally {
      setLoading(false);
    }
  }, [datasetName, selectedTable, page, orderBy, orderDir, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (col: string) => {
    if (orderBy === col) {
      setOrderDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(col);
      setOrderDir("asc");
    }
  };

  const totalPages = data ? Math.ceil(data.total_count / PAGE_SIZE) : 0;
  const startRow = page * PAGE_SIZE + 1;
  const endRow = data ? Math.min((page + 1) * PAGE_SIZE, data.total_count) : 0;

  if (tablesLoading) {
    return <p className="py-8 text-center text-sm text-slate/60">Loading tables…</p>;
  }

  if (tables.length === 0) {
    return <p className="py-8 text-center text-sm text-slate/60">This dataset has no tables.</p>;
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
        >
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search all columns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[10rem] rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm text-ink placeholder:text-slate/40 outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
        />
        {data && (
          <p className="text-xs text-slate/60 whitespace-nowrap">
            {data.total_count.toLocaleString()} rows &middot; {data.columns.length} columns
          </p>
        )}
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-sand-strong/70 bg-card">
        <div className="max-h-[28rem] overflow-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate/50">
              <span className="inline-block h-2 w-2 rounded-full bg-ember animate-pulse" />
              Loading...
            </div>
          )}
          {error && <div className="py-16 text-center text-sm text-red-500">{error}</div>}
          {!loading && !error && data && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-sand/90 dark:bg-sand/20 text-[0.7rem] uppercase tracking-[0.14em] text-slate shadow-sm">
                <tr>
                  <th className="px-3 py-2.5 font-medium text-slate/40 w-10 select-none">#</th>
                  {data.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 font-medium cursor-pointer select-none hover:text-ink whitespace-nowrap transition-colors"
                      onClick={() => handleSort(col)}
                    >
                      {col}
                      <span className="ml-1 text-slate/40">
                        {orderBy === col ? (orderDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={data.columns.length + 1} className="px-3 py-12 text-center text-slate/50">
                      No rows match your search.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, i) => (
                    <tr key={i} className="border-t border-sand-strong/40 hover:bg-sand/30 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-3 py-2 text-slate/30 font-mono tabular-nums select-none">
                        {startRow + i}
                      </td>
                      {data.columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-ink/90 max-w-xs truncate" title={String(row[col] ?? "")}>
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {data && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-sand-strong/50 bg-sand/20 dark:bg-white/[0.02]">
            <span className="text-xs text-slate/50">
              {data.total_count === 0 ? "No rows" : `Rows ${startRow}–${endRow} of ${data.total_count.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-40 transition"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || loading}
              >
                Prev
              </button>
              <span className="text-xs text-slate/50 tabular-nums">
                {totalPages > 0 ? `${page + 1} / ${totalPages}` : "—"}
              </span>
              <button
                className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-40 transition"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
