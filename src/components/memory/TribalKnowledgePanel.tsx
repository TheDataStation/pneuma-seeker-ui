// src/components/memory/TribalKnowledgePanel.tsx
"use client";

import { EntryListPanel } from "@/components/memory/EntryListPanel";

export const TRIBAL_KNOWLEDGE_HINT =
  "Facts or gotchas about a dataset that help others in your group interpret it correctly — undocumented assumptions, quirks, or pitfalls that aren't obvious from the data itself.";

export default function TribalKnowledgePanel() {
  return (
    <div className="panel rounded-2xl p-6">
      <EntryListPanel memoryType="tribal_knowledge" canCreate canEdit />
    </div>
  );
}
