// src/components/memory/EntryListPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createMemoryEntry,
  deleteMemoryEntry,
  listMemoryEntries,
  updateMemoryEntry,
} from "@/lib/api";
import type { MemoryEntry, MemoryType } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Inline confirm-delete                                                       */
/* -------------------------------------------------------------------------- */

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-slate/70">Sure?</span>
        <button
          className="text-xs font-semibold text-red-600 hover:underline"
          onClick={onDelete}
        >
          Yes
        </button>
        <button
          className="text-xs text-slate/70 hover:underline"
          onClick={() => setConfirm(false)}
        >
          No
        </button>
      </span>
    );
  }
  return (
    <button
      className="text-xs text-slate/50 hover:text-red-600 transition-colors"
      onClick={() => setConfirm(true)}
    >
      Delete
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic entry list (tribal knowledge / preferences / agent learning /       */
/* table & column metadata)                                                    */
/* -------------------------------------------------------------------------- */

function EntryRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: MemoryEntry;
  onSave?: (content: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.content);
  const [saving, setSaving] = useState(false);

  if (editing && onSave) {
    return (
      <div className="rounded-xl border border-sand-strong/50 bg-sand/40 dark:bg-white/[0.03] px-4 py-3 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
        />
        <div className="flex justify-end gap-3">
          <button
            className="text-xs text-slate/60 hover:underline"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          <button
            disabled={saving || !draft.trim()}
            className="cursor-pointer rounded-lg bg-ember px-3 py-1.5 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
            onClick={async () => {
              setSaving(true);
              await onSave(draft.trim());
              setSaving(false);
              setEditing(false);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-sand-strong/50 bg-sand/40 dark:bg-white/[0.03] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink whitespace-pre-wrap">{entry.content}</p>
        <p className="mt-1 text-[11px] text-slate/50">
          {entry.source}
          {entry.created_at
            ? ` · ${new Date(entry.created_at).toLocaleString()}`
            : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onSave && (
          <button
            className="text-xs text-slate/60 hover:text-ember transition-colors"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
        <DeleteButton onDelete={onDelete} />
      </div>
    </div>
  );
}

export function EntryListPanel({
  memoryType,
  datasetName,
  canCreate,
  canEdit,
}: {
  memoryType: MemoryType;
  datasetName?: string;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMemoryEntries(memoryType, {
        datasetName,
        limit: 50,
      });
      setEntries(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries.");
    } finally {
      setLoading(false);
    }
  }, [memoryType, datasetName]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createMemoryEntry({
        memory_type: memoryType,
        content: draft.trim(),
        dataset_name: datasetName,
      });
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(memoryId: string) {
    try {
      await deleteMemoryEntry(memoryId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete entry.");
    }
  }

  async function handleSave(memoryId: string, content: string) {
    try {
      await updateMemoryEntry(memoryId, content);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry.");
    }
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Add a note manually…"
            className="flex-1 rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
          />
          <button
            disabled={submitting || !draft.trim()}
            onClick={handleCreate}
            className="cursor-pointer rounded-xl bg-ember px-4 py-2.5 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate/60">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate/60">
          Nothing here yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <EntryRow
              key={entry.memory_id}
              entry={entry}
              onSave={
                canEdit
                  ? (content) => handleSave(entry.memory_id, content)
                  : undefined
              }
              onDelete={() => handleDelete(entry.memory_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
