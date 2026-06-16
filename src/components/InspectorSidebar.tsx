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
  sidebarStatus: string;
  updateChatState: (chatId: string, updater: (current: any) => any) => void;
  onExecute: () => Promise<void>;
  onTableDownload: () => Promise<void>;
  onProvenanceDownload: () => Promise<void>;
}

export function hasSidebarContent(sidebar: ChatStateResponse | null): boolean {
  if (!sidebar) return false;
  const hasRetrievedTables =
    Object.keys(sidebar.retrieved_tables ?? {}).length > 0;
  const hasPrepareData = (sidebar.prov_steps ?? []).length > 0;
  const hasViewsAndScript =
    (sidebar.state?.T && Object.keys(sidebar.state.T).length > 0) ||
    !!sidebar.state?.S;
  return hasRetrievedTables || hasPrepareData || hasViewsAndScript;
}

// ── Step 2: Materialize Views ─────────────────────────────────────────────────

interface MaterializeViewsStepProps {
  sidebar: ChatStateResponse | null;
  provIndex: number;
  activeChatId: string;
  updateChatState: (chatId: string, updater: (current: any) => any) => void;
  onTableDownload: () => Promise<void>;
  onProvenanceDownload: () => Promise<void>;
}

function MaterializeViewsStep({
  sidebar,
  provIndex,
  activeChatId,
  updateChatState,
  onTableDownload,
  onProvenanceDownload,
}: MaterializeViewsStepProps) {
  const [showProvenance, setShowProvenance] = useState(false);
  const [targetViewIndex, setTargetViewIndex] = useState(0);

  const targetViews = sidebar?.state?.T ? Object.entries(sidebar.state.T) : [];
  const provSteps = sidebar?.prov_steps ?? [];
  const currentView = targetViews[targetViewIndex];

  return (
    <div className="space-y-4">
      {/* Target views carousel */}
      {targetViews.length > 0 ? (
        <div className="space-y-3">
          <TablePreview
            title={currentView[0]}
            rows={currentView[1] as TableRow[]}
            columnDescriptions={
              sidebar?.state?.column_descriptions?.[currentView[0]] ?? {}
            }
          />
          {targetViews.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                onClick={() => setTargetViewIndex((i) => Math.max(i - 1, 0))}
                disabled={targetViewIndex === 0}
              >
                Prev
              </button>
              <span className="text-xs text-slate/50">
                {targetViewIndex + 1} / {targetViews.length}
              </span>
              <button
                className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
                onClick={() =>
                  setTargetViewIndex((i) =>
                    Math.min(i + 1, targetViews.length - 1),
                  )
                }
                disabled={targetViewIndex >= targetViews.length - 1}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate/70">No target views yet.</p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {sidebar?.state?.is_T_materialized && (
          <button
            className="cursor-pointer w-full rounded-2xl border border-sand-strong/70 bg-sea px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50"
            onClick={onTableDownload}
          >
            Download views
          </button>
        )}
        {provSteps.length > 0 && (
          <button
            className="cursor-pointer w-full rounded-2xl border border-sand-strong/70 bg-[#800000] px-4 py-3 text-sm font-semibold text-white transition hover:border-ember/50"
            onClick={() => setShowProvenance((v) => !v)}
          >
            {showProvenance ? "Hide" : "Show"} preparation steps
          </button>
        )}
      </div>

      {/* Provenance carousel — revealed on demand */}
      {showProvenance && provSteps.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="rounded-2xl border border-sand-strong/70 bg-card px-4 py-3 overflow-hidden">
            <div
              className="text-sm leading-relaxed text-ink break-words [&_pre]:mt-3 [&_pre]:rounded-2xl [&_pre]:bg-sand/80 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-[0.82rem] [&_code]:break-all"
              dangerouslySetInnerHTML={{
                __html: marked.parse(provSteps[provIndex] ?? ""),
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
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
            <span className="text-xs text-slate/50">
              {provIndex + 1} / {provSteps.length}
            </span>
            <button
              className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
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
            <button
              className="cursor-pointer w-full rounded-2xl border border-sand-strong/70 bg-card px-4 py-3 text-sm font-semibold text-ink transition hover:border-ember/50"
              onClick={onProvenanceDownload}
            >
              Download preparation script
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Execute Script ────────────────────────────────────────────────────

interface ExecuteScriptStepProps {
  sidebar: ChatStateResponse | null;
  executionResult: TableRow[];
  onExecute: () => Promise<void>;
}

function ExecuteScriptStep({
  sidebar,
  executionResult,
  onExecute,
}: ExecuteScriptStepProps) {
  const [copied, setCopied] = useState(false);
  const script = sidebar?.state?.S?.trim() || "";

  const handleCopy = () => {
    if (!script) return;
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <pre className="max-h-48 overflow-auto rounded-2xl border border-sand-strong/70 bg-card px-4 py-3 text-xs text-ink">
          {script || "No script yet."}
        </pre>
        {script && (
          <button
            className="cursor-pointer absolute top-2 right-2 rounded-lg border border-sand-strong/70 bg-card px-2 py-1 text-xs font-semibold text-slate/60 transition hover:text-ink hover:border-slate/40"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
      <button
        className="cursor-pointer w-full rounded-2xl bg-sea px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        onClick={onExecute}
        disabled={!script}
      >
        Execute script
      </button>
      {executionResult.length > 0 && (
        <TablePreview title="Execution result" rows={executionResult} />
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function InspectorSidebar({
  activeChatId,
  sidebar,
  tableIndex,
  provIndex,
  executionResult,
  queryInput,
  queryResult,
  sidebarStatus,
  updateChatState,
  onExecute,
  onTableDownload,
  onProvenanceDownload,
}: InspectorSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    retrieveTables: false,
    materializeViews: false,
    executeScript: false,
  });

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const retrievedTables = sidebar?.retrieved_tables ?? {};
  const retrievedTableNames = Object.keys(retrievedTables);
  const provSteps = sidebar?.prov_steps ?? [];

  const hasRetrievedTables = retrievedTableNames.length > 0;
  const hasMaterializeViews =
    (sidebar?.state?.T && Object.keys(sidebar.state.T).length > 0) ||
    provSteps.length > 0;
  const hasExecuteScript = !!sidebar?.state?.S;

  type StepDef = { key: string; label: string; render: () => React.ReactNode };
  const steps: StepDef[] = [];

  if (hasRetrievedTables) {
    steps.push({
      key: "retrieveTables",
      label: "Retrieve Tables",
      render: () => (
        <div className="space-y-3">
          <TablePreview
            title={retrievedTableNames[tableIndex]}
            rows={retrievedTables[retrievedTableNames[tableIndex]]}
          />
          <div className="flex items-center justify-between">
            <button
              className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
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
            <span className="text-xs text-slate/50">
              {tableIndex + 1} / {retrievedTableNames.length}
            </span>
            <button
              className="cursor-pointer rounded-full border border-sand-strong/70 bg-card px-3 py-1 text-xs font-semibold text-slate disabled:opacity-50"
              onClick={() =>
                updateChatState(activeChatId, (prev) => ({
                  ...prev,
                  tableIndex: Math.min(
                    prev.tableIndex + 1,
                    retrievedTableNames.length - 1,
                  ),
                }))
              }
              disabled={tableIndex >= retrievedTableNames.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      ),
    });
  }

  if (hasMaterializeViews) {
    steps.push({
      key: "materializeViews",
      label: "Materialize Views",
      render: () => (
        <MaterializeViewsStep
          sidebar={sidebar}
          provIndex={provIndex}
          activeChatId={activeChatId}
          updateChatState={updateChatState}
          onTableDownload={onTableDownload}
          onProvenanceDownload={onProvenanceDownload}
        />
      ),
    });
  }

  if (hasExecuteScript) {
    steps.push({
      key: "executeScript",
      label: "Execute Script",
      render: () => (
        <ExecuteScriptStep
          sidebar={sidebar}
          executionResult={executionResult}
          onExecute={onExecute}
        />
      ),
    });
  }

  if (steps.length === 0) return null;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-2">
      {sidebarStatus === "Refreshing..." && steps.length === 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-sand-strong/70 bg-card px-4 py-2.5 text-xs text-slate/60">
          <span className="inline-block h-2 w-2 rounded-full bg-ember animate-pulse" />
          Loading analysis state…
        </div>
      )}
      <div className="px-1">
        <h2 className="font-display text-2xl">Analysis Pipeline</h2>
        <p className="mt-1 text-sm text-slate/60">
          The steps Pneuma-Seeker took to answer your question.
        </p>
      </div>
      {steps.map((step, idx) => (
        <section key={step.key} className="panel rounded-[15px] p-6">
          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={() => toggleSection(step.key)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#800000] text-white text-sm font-bold">
                {idx + 1}
              </span>
              <h3 className="font-display text-xl">{step.label}</h3>
              <span className="text-xs text-slate/40">
                {expandedSections[step.key] ? "▲" : "▼"}
              </span>
            </div>
          </div>
          {expandedSections[step.key] && (
            <div className="mt-4">{step.render()}</div>
          )}
        </section>
      ))}
    </aside>
  );
}
