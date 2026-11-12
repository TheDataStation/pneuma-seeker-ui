// src/components/datasets/DatasetDescription.tsx
"use client";

import { useEffect, useState } from "react";
import {
  getDatasetDescription,
  updateDatasetDescription,
} from "@/lib/api";

/**
 * What a dataset is about, shown under its name with an in-place editor.
 * Agents read the same text when they list datasets (multi-dataset mode) to
 * decide where to look for data. Like table and column descriptions, anyone
 * who can open the dataset can edit it. Saving an empty text removes it.
 */
export function DatasetDescription({ dataset }: { dataset: string }) {
  const [saved, setSaved] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent remounts this per dataset (key={dataset}), so no reset is needed here.
  useEffect(() => {
    let cancelled = false;
    getDatasetDescription(dataset)
      .then((d) => !cancelled && setSaved(d.description))
      .catch(() => !cancelled && setSaved(""));
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  if (saved === null) return null;

  function startEditing() {
    setDraft(saved ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await updateDatasetDescription(dataset, draft.trim());
      setSaved(res.description);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save description.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="max-w-3xl space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          aria-label="Dataset description"
          placeholder="Describe what this dataset is about: its subject, sources, time span, and coverage…"
          className="w-full rounded-lg border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || draft.trim() === saved}
            className="cursor-pointer rounded-lg bg-ember px-4 py-2 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save description"}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="cursor-pointer text-xs font-semibold text-slate/60 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!saved) {
    return (
      <button
        onClick={startEditing}
        className="flex cursor-pointer items-center gap-1.5 text-sm text-slate/50 transition hover:text-ink"
      >
        <PencilIcon />
        Add a description
      </button>
    );
  }

  return (
    <div className="flex max-w-3xl items-start gap-1.5">
      <p className="min-w-0 whitespace-pre-line text-sm text-slate">{saved}</p>
      <button
        onClick={startEditing}
        aria-label="Edit description"
        title="Edit description"
        className="mt-0.5 shrink-0 cursor-pointer rounded p-0.5 text-slate/50 transition hover:text-ink"
      >
        <PencilIcon />
      </button>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
