import type { TableRow } from "@/lib/types";

type TablePreviewProps = {
  title?: string;
  rows: TableRow[];
  columnDescriptions?: Record<string, string>;
};

export function TablePreview({ title, rows, columnDescriptions }: TablePreviewProps) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-2">
      {title ? (
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
          {title}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-sand-strong/70 bg-white/90 shadow-sm">
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
                  <td className="px-3 py-3 text-slate/70">No rows yet.</td>
                </tr>
              ) : (
                rows.slice(0, 8).map((row, rowIndex) => (
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
