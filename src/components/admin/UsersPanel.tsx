// src/components/admin/UsersPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  listGroups,
} from "@/lib/api/auth";
import type { Group, User } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit modal                                                                  */
/* -------------------------------------------------------------------------- */

type EditModalProps = {
  user: User;
  groups: Group[];
  onSave: (userId: string, patch: { username?: string; group_id?: string | null; is_active?: boolean }) => Promise<void>;
  onClose: () => void;
};

function EditUserModal({ user, groups, onSave, onClose }: EditModalProps) {
  const [username, setUsername] = useState(user.username);
  const [groupId, setGroupId] = useState(user.group_id ?? "");
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const patch: { username?: string; group_id?: string | null; is_active?: boolean } = {};
    if (username !== user.username) patch.username = username;
    if (groupId !== (user.group_id ?? "")) patch.group_id = groupId || null;
    if (isActive !== user.is_active) patch.is_active = isActive;
    if (Object.keys(patch).length === 0) { onClose(); return; }
    try {
      await onSave(user.user_id, patch);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="panel w-full max-w-md rounded-[15px] p-6 rise-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl">Edit user</h2>
          <button
            className="rounded-full p-1 text-slate hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <p className="mb-5 truncate text-xs text-slate/70">{user.email}</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.22em]">Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2.5 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
            >
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>{g.name}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <div
                className={`h-5 w-9 rounded-full transition-colors ${isActive ? "bg-ember" : "bg-slate/30"}`}
              />
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </div>
            <span className="text-sm">Active</span>
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>
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
/* Confirm-delete row action                                                   */
/* -------------------------------------------------------------------------- */

function DeleteCell({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-slate/70">Sure?</span>
        <button className="text-xs font-semibold text-red-600 hover:underline" onClick={onDelete}>Yes</button>
        <button className="text-xs text-slate/70 hover:underline" onClick={() => setConfirm(false)}>No</button>
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
/* Main panel                                                                  */
/* -------------------------------------------------------------------------- */

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [us, gs] = await Promise.all([listUsers(), listGroups()]);
      setUsers(us);
      setGroups(gs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(userId: string, patch: Parameters<typeof updateUser>[1]) {
    await updateUser(userId, patch);
    await load();
  }

  async function handleDelete(userId: string) {
    await deleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  const filtered = search
    ? users.filter(
        (u) =>
          u.email.includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by email or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-xl border border-sand-strong/70 bg-white dark:bg-card px-4 py-2 text-sm outline-none focus:border-ember/50 focus:ring-2 focus:ring-ember/20"
        />
        <span className="text-xs text-slate/60">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate/60">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate/60">No users found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand-strong/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-strong/60 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate/70">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.user_id}
                  className={`border-b border-sand-strong/30 last:border-0 ${
                    i % 2 === 0 ? "" : "bg-sand/30 dark:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-3 text-ink">{u.email}</td>
                  <td className="px-4 py-3 text-slate">{u.username}</td>
                  <td className="px-4 py-3 text-slate">{u.group_name ?? <span className="italic text-slate/40">none</span>}</td>
                  <td className="px-4 py-3"><Badge active={u.is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4 justify-end">
                      <button
                        className="text-xs text-slate/60 hover:text-ember transition-colors"
                        onClick={() => setEditingUser(u)}
                      >
                        Edit
                      </button>
                      <DeleteCell onDelete={() => handleDelete(u.user_id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          groups={groups}
          onSave={handleSave}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
