// src/components/memory/MemoryPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { getAccessibleDatasets } from "@/lib/api";
import { HelpTooltip } from "@/components/HelpTooltip";
import { EntryListPanel } from "@/components/memory/EntryListPanel";

type Tab = "tribal_knowledge" | "user_preference" | "agent_learning";

const TAB_LABELS: Record<Tab, string> = {
  tribal_knowledge: "Tribal Knowledge",
  user_preference: "My Preferences",
  agent_learning: "Agent Learning",
};

const TAB_HINTS: Record<Tab, string> = {
  tribal_knowledge:
    "Facts or gotchas about a dataset that help others in your group interpret it correctly — undocumented assumptions, quirks, or pitfalls that aren't obvious from the data itself.",
  user_preference:
    "Personal notes about how you like analyses done. Only visible to you, and only used to tailor answers in your own conversations.",
  agent_learning:
    "Answers Pneuma has already worked out for tricky questions about a dataset. Reusing them saves time instead of re-deriving the same answer from scratch.",
};

/* -------------------------------------------------------------------------- */
/* Agent learning (dataset-scoped, read-only + delete)                        */
/* -------------------------------------------------------------------------- */

function AgentLearningPanel() {
  const [datasets, setDatasets] = useState<string[]>([]);
  const [dataset, setDataset] = useState("");

  useEffect(() => {
    getAccessibleDatasets()
      .then((r) => {
        setDatasets(r.datasets);
        if (r.datasets.length > 0) setDataset((d) => d || r.datasets[0]);
      })
      .catch(() => setDatasets([]));
  }, []);

  if (datasets.length === 0) {
    return <p className="py-8 text-center text-sm text-slate/60">No accessible datasets.</p>;
  }

  return (
    <div className="space-y-5">
      <select
        value={dataset}
        onChange={(e) => setDataset(e.target.value)}
        className="rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
      >
        {datasets.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <EntryListPanel key={dataset} memoryType="agent_learning" datasetName={dataset} canCreate={false} canEdit={false} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main panel                                                                  */
/* -------------------------------------------------------------------------- */

export default function MemoryPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("tribal_knowledge");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-sand-strong/60 bg-sand/40 dark:bg-white/[0.03] p-1 w-fit">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab ? "bg-white dark:bg-card text-ink shadow-sm" : "text-slate/60 hover:text-ink"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="panel rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">{TAB_LABELS[activeTab]}</h2>
          <HelpTooltip text={TAB_HINTS[activeTab]} ariaLabel={`What is ${TAB_LABELS[activeTab]}?`} />
        </div>

        {activeTab === "tribal_knowledge" && (
          <EntryListPanel memoryType="tribal_knowledge" canCreate canEdit />
        )}
        {activeTab === "user_preference" && (
          <EntryListPanel memoryType="user_preference" canCreate canEdit />
        )}
        {activeTab === "agent_learning" && <AgentLearningPanel />}
      </div>
    </div>
  );
}
