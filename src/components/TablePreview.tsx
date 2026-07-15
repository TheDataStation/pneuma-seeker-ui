import type { TableRow } from "@/lib/types";

type TablePreviewProps = {
  title?: string;
  rows: TableRow[];
  columnDescriptions?: Record<string, string>;
  onExpand?: () => void;
};

export function TablePreview({ title, rows, columnDescriptions, onExpand }: TablePreviewProps) {
  // Falls back to columnDescriptions' keys when there are no rows, so a
  // schema-only table (defined but not yet materialized) still shows its
  // column headers instead of collapsing to "Empty table" with no schema.
  const columns =
    rows.length > 0 ? Object.keys(rows[0]) : Object.keys(columnDescriptions ?? {});

  return (
    <div className="space-y-2">
      {(title || onExpand) ? (
        <div className="flex items-center justify-between gap-2">
          {title ? (
            <div className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
              {title}
            </div>
          ) : <span className="flex-1" />}
          {onExpand && (
            <button
              onClick={onExpand}
              className="cursor-pointer rounded-lg border border-sand-strong/70 bg-card px-2 py-0.5 text-[0.65rem] font-semibold text-slate/60 hover:text-ink hover:border-slate/40 transition leading-none"
              title="Open full table explorer"
            >
              ↗ Expand
            </button>
          )}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-sand-strong/70 bg-card/90 shadow-sm">
        <div className="max-h-52 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-sand/80 text-[0.7rem] uppercase tracking-[0.14em] text-slate">
              <tr>
                {columns.length === 0 ? (
                  <th className="px-3 py-2">Empty table</th>
                ) : (
                  columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 font-medium"
                      title={columnDescriptions?.[col] ?? ""}
                    >
                      {col}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate/70" colSpan={columns.length || 1}>
                    No rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-sand-strong/50">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-ink/90">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
