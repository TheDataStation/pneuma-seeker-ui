"use client";
import { useState, useEffect, useCallback } from "react";
import { queryTable, downloadTableCSV } from "@/lib/api/chat";
import type { TableQueryResponse } from "@/lib/types";

type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

interface TableExplorerModalProps {
  chatId: string;
  tableId: string;
  tableName: string;
  datasetName?: string;
  onClose: () => void;
}

export function TableExplorerModal({
  chatId,
  tableId,
  tableName,
  datasetName,
  onClose,
}: TableExplorerModalProps) {
  const [data, setData] = useState<TableQueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, orderBy, orderDir]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryTable(chatId, tableId, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        order_by: orderBy ?? undefined,
        order_dir: orderDir,
        search: debouncedSearch || undefined,
        dataset_name: datasetName,
      });
      setData(result);
    } catch {
      setError("Failed to load table data.");
    } finally {
      setLoading(false);
    }
  }, [chatId, tableId, page, orderBy, orderDir, debouncedSearch, datasetName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadTableCSV(chatId, tableId, { dataset_name: datasetName });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloading(false);
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col w-[90vw] max-w-7xl h-[85vh] rounded-2xl border border-sand-strong/70 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand-strong/50 bg-sand/40 shrink-0">
          <div>
            <h2 className="font-display text-xl text-ink">{tableName}</h2>
            {data && (
              <p className="text-xs text-slate/60 mt-0.5">
                {data.total_count.toLocaleString()} rows &middot; {data.columns.length} columns
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search all columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-sand-strong/70 bg-card px-3 py-1.5 text-sm text-ink placeholder:text-slate/40 focus:outline-none focus:border-slate/40 w-56"
            />
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="cursor-pointer rounded-xl border border-sand-strong/70 bg-card px-3 py-1.5 text-sm font-semibold text-slate hover:text-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? "Downloading..." : "⬇ Download CSV"}
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-sand-strong/70 bg-card px-3 py-1.5 text-sm font-semibold text-slate hover:text-ink transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Table area */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full text-slate/50 text-sm gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-ember animate-pulse" />
              Loading...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-500 text-sm">
              {error}
            </div>
          )}
          {!loading && !error && data && (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-sand/90 text-[0.7rem] uppercase tracking-[0.14em] text-slate shadow-sm">
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
                    <td
                      colSpan={data.columns.length + 1}
                      className="px-3 py-12 text-center text-slate/50"
                    >
                      No rows match your search.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t border-sand-strong/40 hover:bg-sand/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-slate/30 font-mono tabular-nums select-none">
                        {startRow + i}
                      </td>
                      {data.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-ink/90 max-w-xs truncate"
                          title={String(row[col] ?? "")}
                        >
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

        {/* Pagination footer */}
        {data && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-sand-strong/50 bg-sand/20 shrink-0">
            <span className="text-xs text-slate/50">
              {data.total_count === 0
                ? "No rows"
                : `Rows ${startRow}–${endRow} of ${data.total_count.toLocaleString()}`}
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
