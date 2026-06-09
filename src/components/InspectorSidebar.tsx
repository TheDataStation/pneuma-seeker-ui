// src/components/InspectorSidebar.tsx
"use client";

import { useState } from "react";
import { marked } from "marked";
import { TablePreview } from "@/components/TablePreview";
import type { ChatStateResponse, TableRow } from "@/lib/types";

interface InspectorSidebarProps {
  activeChatId: string;
  sidebar: ChatStateResponse | null;
  tableIndex: number;
  provIndex: number;
  executionResult: TableRow[];
  queryInput: string;
  queryResult: TableRow[];
  updateChatState: (chatId: string, updater: (current: any) => any) => void;
  onExecute: () => Promise<void>;
  onTableDownload: () => Promise<void>;
  onProvenanceDownload: () => Promise<void>;
}

export function InspectorSidebar({
  activeChatId,
  sidebar,
  tableIndex,
  provIndex,
  executionResult,
  queryInput,
  queryResult,
  updateChatState,
  onExecute,
  onTableDownload,
  onProvenanceDownload,
}: InspectorSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    askState: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const retrievedTables = sidebar?.retrieved_tables ?? {};
  const retrievedTableNames = Object.keys(retrievedTables);
  const provSteps = sidebar?.prov_steps ?? [];

  const currentRetrievedTable =
    retrievedTableNames.length > 0
      ? retrievedTables[retrievedTableNames[tableIndex]]
      : [];
  const currentProvStep = provSteps[provIndex] ?? "";

  return (
    <aside className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-2">
      {/* Step 1: Retrieve Tables */}
      <section className="panel rounded-[15px] p-6">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => toggleSection("step1")}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl">Step 1: Retrieve Tables</h3>
            <span className="text-xs text-slate/40">
              {expandedSections.step1 ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {expandedSections.step1 && (
          <div className="mt-4">
            {retrievedTableNames.length === 0 ? (
              <p className="text-sm text-slate/70">No tables retrieved yet.</p>
            ) : (
              <div className="space-y-3">
                <TablePreview
                  title={retrievedTableNames[tableIndex]}
                  rows={currentRetrievedTable}
                />
                <div className="flex items-center justify-between">
                  <button
                    className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                    onClick={() =>
                      updateChatState(activeChatId, (prev) => ({
                        ...prev,
                        tableIndex: Math.max(prev.tableIndex - 1, 0),
                      }))
                    }
                    disabled={tableIndex === 0}
                  >
                    Prev
                  </button>
                  <button
                    className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                    onClick={() =>
                      updateChatState(activeChatId, (prev) => ({
                        ...prev,
                        tableIndex: Math.min(
                          prev.tableIndex + 1,
                          retrievedTableNames.length - 1
                        ),
                      }))
                    }
                    disabled={tableIndex >= retrievedTableNames.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Prepare Data */}
      <section className="panel rounded-[15px] p-6">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => toggleSection("step2")}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl">Step 2: Prepare Data</h3>
            <span className="text-xs text-slate/40">
              {expandedSections.step2 ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {expandedSections.step2 && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm text-ink">
              {provSteps.length === 0 ? (
                <p className="text-slate/70">No provenance steps yet.</p>
              ) : (
                <div
                  className="text-sm leading-relaxed text-ink [&_pre]:mt-3 [&_pre]:rounded-2xl [&_pre]:bg-sand/80 [&_pre]:p-3 [&_code]:text-[0.82rem]"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(currentProvStep),
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                onClick={() =>
                  updateChatState(activeChatId, (prev) => ({
                    ...prev,
                    provIndex: Math.max(prev.provIndex - 1, 0),
                  }))
                }
                disabled={provIndex === 0}
              >
                Prev
              </button>
              <button
                className="rounded-full border border-sand-strong/70 bg-white px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                onClick={() =>
                  updateChatState(activeChatId, (prev) => ({
                    ...prev,
                    provIndex: Math.min(prev.provIndex + 1, provSteps.length - 1),
                  }))
                }
                disabled={provIndex >= provSteps.length - 1}
              >
                Next
              </button>
            </div>
            {sidebar?.state?.is_T_materialized && (
              <div className="pt-2">
                <button
                  className="w-full rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ember/50"
                  onClick={onProvenanceDownload}
                >
                  Download provenance script
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 3: Define Views & Script */}
      <section className="panel rounded-[15px] p-6">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => toggleSection("step3")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl">Step 3: Define Views & Script</h3>
            <span className="text-xs text-slate/40">
              {expandedSections.step3 ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {expandedSections.step3 && (
          <div className="mt-4 space-y-4">
            {sidebar?.state?.T ? (
              Object.entries(sidebar.state.T).map(([name, rows]) => (
                <TablePreview
                  key={name}
                  title={name}
                  rows={rows as TableRow[]}
                  columnDescriptions={
                    sidebar.state.column_descriptions?.[name] ?? {}
                  }
                />
              ))
            ) : (
              <p className="text-sm text-slate/70">No target tables yet.</p>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/70">
                  Python script (S)
                </p>
                <pre className="mt-2 max-h-48 overflow-auto rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-xs text-ink">
                  {sidebar?.state?.S?.trim() || "No script yet."}
                </pre>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="rounded-2xl bg-sea px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={onExecute}
                  disabled={!sidebar?.state?.S}
                >
                  Execute script
                </button>
                {sidebar?.state?.is_T_materialized && (
                  <button
                    className="rounded-2xl border border-sand-strong/70 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-ember/50"
                    onClick={onTableDownload}
                  >
                    Download target views (T)
                  </button>
                )}
              </div>
              {executionResult.length > 0 ? (
                <TablePreview title="Execution result" rows={executionResult} />
              ) : null}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
