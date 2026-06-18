// src/components/admin/GroupsPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupPermissions,
  setGroupPermission,
  deleteGroupPermission,
} from "@/lib/api/auth";
import { getAccessibleDatasets } from "@/lib/api/chat";
import type { Group } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Create-group modal                                                          */
/* -------------------------------------------------------------------------- */

type CreateGroupModalProps = {
  groups: Group[];
  onCreate: (name: string, parentId: string | null) => Promise<void>;
  onClose: () => void;
};

function CreateGroupModal({
  groups,
  onCreate,
  onClose,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), parentId || null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="panel w-full max-w-sm rounded-[15px] p-6 rise-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl">New group</h2>
          <button
            className="rounded-full p-1 text-slate hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. analysts"
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Parent group
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            >
              <option value="">— none (top-level) —</option>
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl border border-sand-strong/70 px-4 py-2 text-sm hover:brightness-90"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={saving || !name.trim()}
            onClick={handleCreate}
            className="cursor-pointer rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit-group modal                                                            */
/* -------------------------------------------------------------------------- */

type EditGroupModalProps = {
  group: Group;
  groups: Group[];
  onSave: (
    groupId: string,
    patch: { name?: string; parent_group_id?: string | null },
  ) => Promise<void>;
  onClose: () => void;
};

function EditGroupModal({
  group,
  groups,
  onSave,
  onClose,
}: EditGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [parentId, setParentId] = useState(group.parent_group_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const patch: { name?: string; parent_group_id?: string | null } = {};
    if (name !== group.name) patch.name = name;
    const newParent = parentId || null;
    if (newParent !== group.parent_group_id) patch.parent_group_id = newParent;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    try {
      await onSave(group.group_id, patch);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const otherGroups = groups.filter((g) => g.group_id !== group.group_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="panel w-full max-w-sm rounded-[15px] p-6 rise-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl">Edit group</h2>
          <button
            className="rounded-full p-1 text-slate hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">
              Parent group
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            >
              <option value="">— none (top-level) —</option>
              {otherGroups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl border border-sand-strong/70 px-4 py-2 text-sm hover:brightness-90"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="cursor-pointer rounded-xl bg-ember px-4 py-2 text-sm font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline confirm-delete                                                       */
/* -------------------------------------------------------------------------- */

function DeleteCell({ onDelete }: { onDelete: () => void }) {
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
/* Permissions sub-panel                                                       */
/* -------------------------------------------------------------------------- */

const OTHER_PERMISSION_KEYS = [
  "admin",
  "user:management",
  "indexing:management",
];

type PermissionsPanelProps = { group: Group };

function PermissionsPanel({ group }: PermissionsPanelProps) {
  const [perms, setPerms] = useState<Record<string, string>>({});
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [allDatasets, setAllDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [addingDataset, setAddingDataset] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPerms = useCallback(async () => {
    setLoadingPerms(true);
    try {
      const [p, d] = await Promise.all([
        getGroupPermissions(group.group_id),
        getAccessibleDatasets(),
      ]);
      setPerms(p);
      setAllDatasets(d.datasets);
    } catch {
      setPerms({});
    } finally {
      setLoadingPerms(false);
    }
  }, [group.group_id]);

  useEffect(() => {
    loadPerms();
  }, [loadPerms]);

  const datasetPerms = Object.entries(perms).filter(([k]) =>
    k.startsWith("dataset:access:"),
  );
  const otherPerms = Object.entries(perms).filter(
    ([k]) => !k.startsWith("dataset:access:"),
  );
  const availableDatasets = allDatasets.filter(
    (d) => !perms[`dataset:access:${d}`],
  );

  async function handleAddDataset() {
    if (!selectedDataset) return;
    setAddingDataset(true);
    setError(null);
    try {
      await setGroupPermission({
        group_id: group.group_id,
        permission_key: `dataset:access:${selectedDataset}`,
        permission_value: "true",
      });
      setSelectedDataset("");
      await loadPerms();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to grant dataset access.",
      );
    } finally {
      setAddingDataset(false);
    }
  }

  async function handleAdd() {
    if (!newKey.trim() || !newVal.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await setGroupPermission({
        group_id: group.group_id,
        permission_key: newKey.trim(),
        permission_value: newVal.trim(),
      });
      setNewKey("");
      setNewVal("");
      await loadPerms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add permission.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(key: string) {
    try {
      await deleteGroupPermission(group.group_id, key);
      await loadPerms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove permission.");
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/70">
        Permissions —{" "}
        <span className="text-ink normal-case font-medium tracking-normal">
          {group.name}
        </span>
      </h3>

      {loadingPerms ? (
        <p className="text-xs text-slate/50">Loading…</p>
      ) : (
        <>
          {/* Dataset access */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/60">
              Dataset access
            </p>
            {datasetPerms.length === 0 ? (
              <p className="text-xs text-slate/40 italic">
                No datasets granted.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {datasetPerms.map(([key]) => {
                  const name = key.slice("dataset:access:".length);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sand-strong/60 bg-sand/50 dark:bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-ink"
                    >
                      {name}
                      <button
                        className="text-slate/40 hover:text-red-500 transition-colors leading-none"
                        onClick={() => handleRemove(key)}
                        title={`Revoke ${name}`}
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                disabled={availableDatasets.length === 0}
                className="flex-1 rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-xs outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20 disabled:opacity-50"
              >
                <option value="">
                  {availableDatasets.length === 0
                    ? "All datasets granted"
                    : "Select dataset…"}
                </option>
                {availableDatasets.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                disabled={addingDataset || !selectedDataset}
                onClick={handleAddDataset}
                className="cursor-pointer rounded-xl bg-ember px-3 py-2 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
              >
                {addingDataset ? "…" : "Grant"}
              </button>
            </div>
          </div>

          {/* Other permissions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate/60">
              Other permissions
            </p>
            {otherPerms.length === 0 ? (
              <p className="text-xs text-slate/40 italic">None set.</p>
            ) : (
              <div className="space-y-1.5">
                {otherPerms.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-sand-strong/50 bg-sand/40 dark:bg-white/[0.03] px-3 py-2"
                  >
                    <span className="text-xs font-mono">
                      <span className="text-ink">{key}</span>
                      <span className="mx-2 text-slate/40">=</span>
                      <span className="text-ember">{val}</span>
                    </span>
                    <button
                      className="ml-3 text-[10px] text-slate/40 hover:text-red-500 transition-colors"
                      onClick={() => handleRemove(key)}
                      title="Remove permission"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                list="other-perm-keys"
                placeholder="Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-xs outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              />
              <datalist id="other-perm-keys">
                {OTHER_PERMISSION_KEYS.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              <input
                type="text"
                placeholder="Value"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="w-24 rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-3 py-2 text-xs outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
              />
              <button
                disabled={adding || !newKey.trim() || !newVal.trim()}
                onClick={handleAdd}
                className="cursor-pointer rounded-xl bg-ember px-3 py-2 text-xs font-semibold text-white duration-300 hover:brightness-90 disabled:opacity-60"
              >
                {adding ? "…" : "Add"}
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main panel                                                                  */
/* -------------------------------------------------------------------------- */

export default function GroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await listGroups());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(name: string, parentId: string | null) {
    await createGroup({ name, parent_group_id: parentId });
    await load();
  }

  async function handleSave(
    groupId: string,
    patch: Parameters<typeof updateGroup>[1],
  ) {
    await updateGroup(groupId, patch);
    await load();
    if (selectedGroup?.group_id === groupId) {
      setSelectedGroup((g) => (g ? { ...g, ...patch } : g));
    }
  }

  async function handleDelete(group: Group) {
    try {
      await deleteGroup(group.group_id);
      if (selectedGroup?.group_id === group.group_id) setSelectedGroup(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const parentName = (g: Group) =>
    groups.find((p) => p.group_id === g.parent_group_id)?.name ?? null;

  return (
    <div className="flex gap-6">
      {/* Left: group list */}
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate/60">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="cursor-pointer rounded-xl bg-ember px-4 py-2 text-xs font-semibold text-white duration-300 hover:brightness-90"
          >
            + New group
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate/60">
            Loading groups…
          </div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate/60">
            No groups found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-sand-strong/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-strong/60 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate/70">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr
                    key={g.group_id}
                    onClick={() =>
                      setSelectedGroup((prev) =>
                        prev?.group_id === g.group_id ? null : g,
                      )
                    }
                    className={`cursor-pointer border-b border-sand-strong/30 last:border-0 transition-colors ${
                      selectedGroup?.group_id === g.group_id
                        ? "bg-ember/5 dark:bg-ember/10"
                        : i % 2 === 0
                          ? "hover:bg-sand/50"
                          : "bg-sand/30 dark:bg-white/[0.02] hover:bg-sand/50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                    <td className="px-4 py-3 text-slate">
                      {parentName(g) ?? (
                        <span className="italic text-slate/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-4 justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="text-xs text-slate/60 hover:text-ember transition-colors"
                          onClick={() => setEditingGroup(g)}
                        >
                          Edit
                        </button>
                        <DeleteCell onDelete={() => handleDelete(g)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right: permissions for selected group */}
      {selectedGroup && (
        <div className="w-80 shrink-0">
          <div className="panel rounded-2xl p-5 space-y-1">
            <PermissionsPanel
              key={selectedGroup.group_id}
              group={selectedGroup}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateGroupModal
          groups={groups}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          groups={groups}
          onSave={handleSave}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </div>
  );
}
